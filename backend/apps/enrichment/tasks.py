import logging
import time
from celery import shared_task
from django.core.cache import cache
from apps.lead_hunter.models import CampaignResult, Campaign
from apps.lead_hunter.views import publish_campaign_progress, log_campaign_event
from services.firecrawl_client import FirecrawlClient
from services.ai_client import AIClient
from services.apollo_client import ApolloClient
from agents.import_agent import LeadImportAgent
from services.apify import apify

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def campaign_scrape_stage_task(self, campaign_id: int):
    # We don't use a campaign lock because we want to allow resuming/retrying cleanly
    # but we DO use a global Firecrawl lock inside the loop.
    
    try:
        campaign = Campaign.objects.get(id=campaign_id)
        
        # Ensure we are in the processing stage
        campaign.stage = 'processing'
        campaign.save(update_fields=['stage'])
        publish_campaign_progress(campaign)
        log_campaign_event(campaign, 'Starting Lead-by-Lead Processing (Firecrawl -> LLM -> Apollo -> LinkedIn -> CRM).')

        # Get all pending results for scraping
        pending_results = CampaignResult.objects.filter(
            campaign_id=campaign_id,
            is_website_scraped__isnull=True,
            qualification_status='qualified'
        ).order_by('id')

        client = FirecrawlClient()

        for cr in pending_results:
            if not cr.website:
                logger.warning(f"CampaignResult {cr.id} has no website to scrape.")
                cr.is_website_scraped = False
                cr.qualification_status = 'unqualified'
                ai_data = cr.ai_clean_data or {}
                ai_data["is_ideal_customer"] = False
                ai_data["qualification_reasoning"] = "Lead Rejected: No website found for scraping."
                cr.ai_clean_data = ai_data
                cr.save(update_fields=['is_website_scraped', 'qualification_status', 'ai_clean_data'])
                
                # Send to CRM immediately and trigger completion check
                LeadImportAgent.run_single_from_ai(cr)
                check_campaign_completion(campaign_id)
                continue

            # ACQUIRE GLOBAL FIRECRAWL LOCK
            # Blocks this worker until the lock is available, ensuring only 1 Firecrawl scrape globally at a time
            while not cache.add("global_firecrawl_lock", "locked", timeout=75):
                logger.info(f"Campaign {campaign_id} waiting for global Firecrawl lock...")
                time.sleep(5)
                
            try:
                logger.info(f"Starting web scrape for CampaignResult {cr.id} at {cr.website}")
                result = client.crawl_website(cr.website)

                if result and not result.get('error'):
                    cr.firecrawl_raw_data = result
                    cr.is_website_scraped = True
                    cr.save(update_fields=['firecrawl_raw_data', 'is_website_scraped'])
                    logger.info(f"Successfully saved scrape data for CampaignResult {cr.id}")
                    
                    # IMMEDIATELY TRIGGER NEXT STAGES FOR THIS LEAD ASYNC!
                    process_single_lead_task.delay(cr.id)
                else:
                    error_msg = result.get('error', 'Unknown Error')
                    logger.error(f"Firecrawl scrape failed for CampaignResult {cr.id}: {error_msg}")
                    cr.is_website_scraped = False
                    
                    if "Rate limit" in error_msg or "Rate Limit" in error_msg or "rate limit" in error_msg:
                        logger.info(f"Rate limit hit! Re-queueing campaign_scrape_stage_task for campaign {campaign_id}")
                        # Release lock early so retry can pick it up
                        cache.delete("global_firecrawl_lock")
                        raise self.retry(exc=Exception(error_msg), countdown=60)
                    else:
                        cr.qualification_status = 'unqualified'
                        ai_data = cr.ai_clean_data or {}
                        ai_data["is_ideal_customer"] = False
                        ai_data["qualification_reasoning"] = f"Lead Rejected: Website scraping failed ({error_msg})."
                        cr.ai_clean_data = ai_data
                        cr.save(update_fields=['is_website_scraped', 'qualification_status', 'ai_clean_data'])
                        
                        LeadImportAgent.run_single_from_ai(cr)
                        check_campaign_completion(campaign_id)
                        
                publish_campaign_progress(campaign)
                
            finally:
                # Keep the lock for 63 seconds to respect Firecrawl rate limits (10 req/min)
                logger.info(f"Scrape complete for CR {cr.id}. Sleeping 63s to respect Firecrawl limits before releasing lock.")
                time.sleep(63)
                cache.delete("global_firecrawl_lock")

    except Exception as e:
        logger.error(f"Error in campaign_scrape_stage_task for Campaign {campaign_id}: {e}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def process_single_lead_task(self, cr_id: int):
    """
    End-to-End Processing for a single lead.
    Runs LLM -> Apollo -> LinkedIn -> AI Insights -> CRM Sync.
    If the lead is rejected at any step, it syncs immediately as unqualified.
    """
    try:
        cr = CampaignResult.objects.get(id=cr_id)
        campaign = cr.campaign
        
        # We only process if it hasn't been completely synced yet
        if cr.is_crm_synced is not None:
            return
            
        ai_client = AIClient()
        apollo = ApolloClient()
        
        # ==========================================
        # STAGE 1: LLM Processing
        # ==========================================
        if cr.is_llm_processed is None:
            logger.info(f"Starting LLM consolidation for CampaignResult {cr.id}")
            success = ai_client.consolidate_lead_data(cr)
            
            if success:
                cr.is_llm_processed = True
                cr.save(update_fields=['is_llm_processed'])
                
                # Check if rejected by LLM
                ai_data = cr.ai_clean_data or {}
                is_ideal = str(ai_data.get("is_ideal_customer", "false")).lower() == 'true'
                if not is_ideal:
                    cr.qualification_status = 'unqualified'
                    cr.save(update_fields=['qualification_status'])
                    LeadImportAgent.run_single_from_ai(cr)
                    check_campaign_completion(campaign.id)
                    return
            else:
                cr.is_llm_processed = False
                cr.qualification_status = 'unqualified'
                cr.save(update_fields=['is_llm_processed', 'qualification_status'])
                LeadImportAgent.run_single_from_ai(cr)
                check_campaign_completion(campaign.id)
                return

        # ==========================================
        # STAGE 2: Apollo Enrichment
        # ==========================================
        if cr.is_apollo_processed is None:
            domain = cr.website
            if domain:
                domain = domain.replace("http://", "").replace("https://", "").strip("/")
                domain = domain.split('/')[0]

            if not domain:
                cr.is_apollo_processed = False
                cr.qualification_status = 'unqualified'
                cr.save(update_fields=['is_apollo_processed', 'qualification_status'])
                LeadImportAgent.run_single_from_ai(cr)
                check_campaign_completion(campaign.id)
                return
                
            logger.info(f"Starting Apollo enrichment for CampaignResult {cr.id} domain {domain}")
            raw_data = cr.raw_data or {}
            ai_data = cr.ai_clean_data or {}
            
            company_data = apollo.enrich_organization(domain)
            if company_data:
                raw_data['apollo_company'] = company_data
                
            people_list = apollo.search_people_by_domain(domain, limit=100)
            
            if not people_list:
                ai_data["is_ideal_customer"] = False
                ai_data["qualification_reasoning"] = "Lead Rejected: No employees found in Apollo for enrichment."
                cr.qualification_status = 'unqualified'
            else:
                decision_makers_result = ai_client.identify_decision_makers(people_list)
                decision_maker_ids = decision_makers_result.get("decision_makers_ids", [])
                linkedin_scrape_id = decision_makers_result.get("linkedin_scrape_id")
                
                if not decision_maker_ids:
                    ai_data["is_ideal_customer"] = False
                    ai_data["qualification_reasoning"] = "Lead Rejected: Apollo search returned employees, but LLM could not pick a valid decision maker."
                    cr.qualification_status = 'unqualified'
                else:
                    contact_results = []
                    has_valid_contact = False
                    
                    for person in people_list:
                        if person.get('id') in decision_maker_ids:
                            first_name = person.get('first_name') or ""
                            last_name = person.get('last_name') or ""
                            
                            contact = apollo.enrich_person(domain, first_name, last_name, apollo_id=person.get('id'))
                            if contact:
                                contact['apollo_person_id'] = person.get('id')
                                contact_results.append(contact)
                                if contact.get('email') or contact.get('phone_numbers'):
                                    has_valid_contact = True
                    
                    if has_valid_contact:
                        raw_data['apollo_contacts'] = contact_results
                        if linkedin_scrape_id:
                            raw_data['primary_linkedin_scrape_id'] = linkedin_scrape_id
                    else:
                        ai_data["is_ideal_customer"] = False
                        ai_data["qualification_reasoning"] = "Lead Rejected: Found decision makers but Apollo had no email or phone contact info for them."
                        cr.qualification_status = 'unqualified'
                        if contact_results:
                            raw_data['apollo_contacts'] = contact_results
                        
            cr.raw_data = raw_data
            cr.ai_clean_data = ai_data
            cr.is_apollo_processed = True
            cr.save(update_fields=['raw_data', 'ai_clean_data', 'qualification_status', 'is_apollo_processed'])
            
            # Limbo Bug Fix: if it failed in Apollo, sync it immediately and stop!
            if cr.qualification_status == 'unqualified':
                LeadImportAgent.run_single_from_ai(cr)
                check_campaign_completion(campaign.id)
                return

        # ==========================================
        # STAGE 3: LinkedIn Scraping
        # ==========================================
        if cr.is_linkedin_processed is None:
            logger.info(f"Starting LinkedIn Scraping for CampaignResult {cr.id}")
            raw_data = cr.raw_data or {}
            ai_data = cr.ai_clean_data or {}
            apollo_contacts = raw_data.get('apollo_contacts', [])
            primary_id = raw_data.get('primary_linkedin_scrape_id')
            
            linkedin_urls = []
            for contact in apollo_contacts:
                if contact.get('linkedin_url'):
                    if not primary_id or str(contact.get('apollo_person_id', '')) == str(primary_id) or str(contact.get('id', '')) == str(primary_id):
                        linkedin_urls.append(contact['linkedin_url'])
                        break
            
            if not linkedin_urls and apollo_contacts:
                for contact in apollo_contacts:
                    if contact.get('linkedin_url'):
                        linkedin_urls.append(contact['linkedin_url'])
                        break
            
            if linkedin_urls:
                try:
                    scraped_profiles = apify.scrape_linkedin_profiles(linkedin_urls)
                    raw_data['linkedin_profiles'] = scraped_profiles
                    ai_data['linkedin_profiles'] = scraped_profiles
                    logger.info(f"Successfully scraped {len(scraped_profiles)} LinkedIn profiles for CampaignResult {cr.id}")
                except Exception as e:
                    logger.error(f"Failed to scrape LinkedIn profiles for CampaignResult {cr.id}: {e}")
            
            cr.raw_data = raw_data
            cr.ai_clean_data = ai_data
            cr.is_linkedin_processed = True
            cr.save(update_fields=['raw_data', 'ai_clean_data', 'is_linkedin_processed'])

        # ==========================================
        # STAGE 4: AI Insights Generation
        # ==========================================
        if cr.is_insights_processed is None:
            logger.info(f"Starting AI Insights generation for CampaignResult {cr.id}")
            ai_data = cr.ai_clean_data or {}
            
            insights = ai_client.generate_insights(ai_data)
            ai_data['insights'] = insights
            
            email_draft = ai_client.generate_email_draft(ai_data, insights)
            ai_data['email_draft'] = email_draft
            
            cr.ai_clean_data = ai_data
            cr.is_insights_processed = True
            cr.save(update_fields=['ai_clean_data', 'is_insights_processed'])

        # ==========================================
        # STAGE 5: Final CRM Sync
        # ==========================================
        LeadImportAgent.run_single_from_ai(cr)
        check_campaign_completion(campaign.id)
        
    except Exception as e:
        logger.error(f"Error in process_single_lead_task for CR {cr_id}: {e}")
        self.retry(exc=e)

def check_campaign_completion(campaign_id: int):
    """
    Checks if all CampaignResults for a campaign have been processed.
    If yes, marks the campaign as fully completed.
    """
    try:
        campaign = Campaign.objects.get(id=campaign_id)
        
        # If campaign is already completed or failed, do nothing
        if campaign.status in ['completed', 'failed']:
            return
            
        # Check if there are any results that haven't been synced to CRM yet
        # (This means they are still pending some processing step)
        pending_count = CampaignResult.objects.filter(
            campaign_id=campaign.id,
            is_crm_synced__isnull=True
        ).count()
        
        if pending_count == 0:
            campaign.stage = 'completed'
            campaign.status = 'completed'
            campaign.save(update_fields=['stage', 'status'])
            log_campaign_event(campaign, 'All leads processed. Campaign is now 100% complete.', level='success')
            logger.info(f"Campaign {campaign.campaign_id} fully completed.")
            publish_campaign_progress(campaign)
        else:
            publish_campaign_progress(campaign)
            
    except Exception as e:
        logger.error(f"Error checking campaign completion for {campaign_id}: {e}")
