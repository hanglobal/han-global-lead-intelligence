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
    lock_id = f"lock_camp_scrape_{campaign_id}"
    if not cache.add(lock_id, "locked", timeout=1200):
        logger.info(f"Task already running for {lock_id}. Skipping duplicate.")
        return

    try:
        campaign = Campaign.objects.get(id=campaign_id)
        
        # Ensure we are in the scraping stage
        campaign.stage = 'website_scraping'
        campaign.save(update_fields=['stage'])
        publish_campaign_progress(campaign)
        log_campaign_event(campaign, 'Starting Website Scraping stage using Firecrawl for basic qualified leads.')

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
                cr.save(update_fields=['is_website_scraped'])
                continue

            logger.info(f"Starting web scrape for CampaignResult {cr.id} at {cr.website}")
            result = client.crawl_website(cr.website)

            if result and not result.get('error'):
                cr.firecrawl_raw_data = result
                cr.is_website_scraped = True
                cr.save(update_fields=['firecrawl_raw_data', 'is_website_scraped'])
                logger.info(f"Successfully saved scrape data for CampaignResult {cr.id}")
            else:
                error_msg = result.get('error', 'Unknown Error')
                logger.error(f"Firecrawl scrape failed for CampaignResult {cr.id}: {error_msg}")
                cr.is_website_scraped = False
                cr.save(update_fields=['is_website_scraped'])
                
                # Check for rate limit explicitly to trigger celery retry for the WHOLE campaign task if needed
                # However, since we are doing sequential processing, we might want to just sleep and retry locally
                # But to keep it simple and robust, we let it fail for that lead or retry
                if "Rate limit" in error_msg or "Rate Limit" in error_msg or "rate limit" in error_msg:
                    logger.info(f"Rate limit hit! Re-queueing campaign_scrape_stage_task for campaign {campaign_id}")
                    # Clear lock and retry the campaign task
                    cache.delete(lock_id)
                    raise self.retry(exc=Exception(error_msg), countdown=60)
            
            # Send live UI updates occasionally
            publish_campaign_progress(campaign)
            
            # Delay to avoid API limits (Free tier is 10 req/min, each lead takes ~6 requests)
            time.sleep(63)

        # Finished all scraping. Transition to LLM processing.
        log_campaign_event(campaign, 'Website Scraping stage completed successfully.')
        campaign.stage = 'llm_processing'
        campaign.save(update_fields=['stage'])
        publish_campaign_progress(campaign)
        log_campaign_event(campaign, 'Starting LLM Processing stage to extract AI clean data.')
        
        campaign_llm_stage_task.delay(campaign_id)

    except Exception as e:
        logger.error(f"Error in campaign_scrape_stage_task for Campaign {campaign_id}: {e}")
        self.retry(exc=e)
    finally:
        cache.delete(lock_id)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def campaign_llm_stage_task(self, campaign_id: int):
    lock_id = f"lock_camp_llm_{campaign_id}"
    if not cache.add(lock_id, "locked", timeout=1200):
        logger.info(f"Task already running for {lock_id}. Skipping duplicate.")
        return
        
    try:
        campaign = Campaign.objects.get(id=campaign_id)
        
        # Get all results pending LLM processing
        pending_results = CampaignResult.objects.filter(
            campaign_id=campaign_id,
            is_llm_processed__isnull=True,
            qualification_status='qualified'
        ).order_by('id')

        client = AIClient()

        for cr in pending_results:
            if cr.is_website_scraped is False:
                logger.warning(f"CampaignResult {cr.id} failed scraping. Rejecting lead.")
                cr.qualification_status = 'unqualified'
                ai_data = cr.ai_clean_data or {}
                ai_data["is_ideal_customer"] = False
                ai_data["qualification_reasoning"] = "Lead Rejected: Website scraping failed or no website found."
                cr.ai_clean_data = ai_data
                cr.is_llm_processed = True
                cr.save(update_fields=['qualification_status', 'ai_clean_data', 'is_llm_processed'])
                
                # We can import unqualified immediately or at the end
                LeadImportAgent.run_unqualified([cr])
                continue

            logger.info(f"Starting LLM consolidation for CampaignResult {cr.id}")
            success = client.consolidate_lead_data(cr)
            
            if success:
                cr.is_llm_processed = True
                cr.save(update_fields=['is_llm_processed'])
                logger.info(f"Successfully processed LLM for CampaignResult {cr.id}")
            else:
                cr.is_llm_processed = False
                cr.save(update_fields=['is_llm_processed'])
                logger.warning(f"LLM processing failed for CampaignResult {cr.id}")
                LeadImportAgent.run_unqualified([cr])

            publish_campaign_progress(campaign)
            
            # Small delay for local LLMs
            time.sleep(1)

        # Transition to Apollo Enrichment
        log_campaign_event(campaign, 'LLM Processing stage completed successfully.')
        campaign.stage = 'apollo_enrichment'
        campaign.save(update_fields=['stage'])
        publish_campaign_progress(campaign)
        log_campaign_event(campaign, 'Starting Apollo Enrichment stage to find B2B contacts and emails.')
        
        campaign_apollo_stage_task.delay(campaign_id)

    except Exception as e:
        logger.error(f"Error in campaign_llm_stage_task for Campaign {campaign_id}: {e}")
        self.retry(exc=e)
    finally:
        cache.delete(lock_id)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def campaign_apollo_stage_task(self, campaign_id: int):
    lock_id = f"lock_camp_apollo_{campaign_id}"
    if not cache.add(lock_id, "locked", timeout=1200):
        logger.info(f"Task already running for {lock_id}. Skipping duplicate.")
        return
        
    try:
        campaign = Campaign.objects.get(id=campaign_id)
        
        # Get all results pending Apollo enrichment
        pending_results = CampaignResult.objects.filter(
            campaign_id=campaign_id,
            is_apollo_processed__isnull=True,
            qualification_status='qualified',
            is_llm_processed=True
        ).order_by('id')

        apollo = ApolloClient()
        ai_client = AIClient()

        for cr in pending_results:
            ai_clean = cr.ai_clean_data or {}
            is_ideal = str(ai_clean.get("is_ideal_customer", "false")).lower() == 'true'
            
            if not is_ideal:
                cr.is_apollo_processed = False
                cr.save(update_fields=['is_apollo_processed'])
                LeadImportAgent.run_single_from_ai(cr)
                continue

            domain = cr.website
            if domain:
                domain = domain.replace("http://", "").replace("https://", "").strip("/")
                domain = domain.split('/')[0]

            if not domain:
                cr.is_apollo_processed = False
                cr.save(update_fields=['is_apollo_processed'])
                LeadImportAgent.run_single_from_ai(cr)
                continue
                
            logger.info(f"Starting Apollo enrichment for CampaignResult {cr.id} domain {domain}")
            raw_data = cr.raw_data or {}
            
            # 1. Company Enrichment
            company_data = apollo.enrich_organization(domain)
            if company_data:
                raw_data['apollo_company'] = company_data
                
            # 2. People Discovery (Free)
            people_list = apollo.search_people_by_domain(domain, limit=100)
            
            if not people_list:
                ai_clean["is_ideal_customer"] = False
                ai_clean["qualification_reasoning"] = "No employees found in Apollo for enrichment."
                cr.ai_clean_data = ai_clean
                cr.qualification_status = 'unqualified'
            else:
                # 3. LLM Identifies Decision Makers
                decision_makers_result = ai_client.identify_decision_makers(people_list)
                decision_maker_ids = decision_makers_result.get("decision_makers_ids", [])
                linkedin_scrape_id = decision_makers_result.get("linkedin_scrape_id")
                
                if not decision_maker_ids:
                    ai_clean["is_ideal_customer"] = False
                    ai_clean["qualification_reasoning"] = "Lead Rejected: Apollo search returned employees, but none were Founders, Directors, or C-Suite (only agents/low-level staff)."
                    cr.ai_clean_data = ai_clean
                    cr.qualification_status = 'unqualified'
                else:
                    # 4. Extract Contact Info
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
                        ai_clean["is_ideal_customer"] = False
                        ai_clean["qualification_reasoning"] = "Lead Rejected: Found decision makers but Apollo had no email or phone contact info for them."
                        cr.ai_clean_data = ai_clean
                        cr.qualification_status = 'unqualified'
                        if contact_results:
                            raw_data['apollo_contacts'] = contact_results
                        
            cr.raw_data = raw_data
            cr.is_apollo_processed = True
            cr.save(update_fields=['raw_data', 'ai_clean_data', 'qualification_status', 'is_apollo_processed'])
            
            # Save successfully enriched but defer CRM sync until Insights stage
            # LeadImportAgent.run_single_from_ai(cr)
            publish_campaign_progress(campaign)
            
            # Small delay to respect rate limits
            time.sleep(1)

        # Transition to LinkedIn Scraping
        log_campaign_event(campaign, 'Apollo Enrichment stage completed successfully.')
        campaign.stage = 'linkedin_scraping'
        campaign.save(update_fields=['stage'])
        logger.info(f"Campaign {campaign.campaign_id} transitioning to LinkedIn Scraping.")
        publish_campaign_progress(campaign)
        log_campaign_event(campaign, 'Starting LinkedIn Scraping stage for deep social insights.')
        
        campaign_linkedin_stage_task.delay(campaign_id)

    except Exception as e:
        logger.error(f"Error in campaign_apollo_stage_task for Campaign {campaign_id}: {e}")
        self.retry(exc=e)
    finally:
        cache.delete(lock_id)

@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def campaign_linkedin_stage_task(self, campaign_id: int):
    lock_id = f"lock_camp_linkedin_{campaign_id}"
    if not cache.add(lock_id, "locked", timeout=1200):
        logger.info(f"Task already running for {lock_id}. Skipping duplicate.")
        return
        
    try:
        campaign = Campaign.objects.get(id=campaign_id)
        
        # Get all results pending linkedin scraping
        pending_results = CampaignResult.objects.filter(
            campaign_id=campaign_id,
            is_linkedin_processed__isnull=True,
            is_apollo_processed=True,
            qualification_status='qualified'
        ).order_by('id')

        for cr in pending_results:
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
                        break  # Only scrape 1 profile
            
            # Fallback if primary_id didn't match any linkedin_url
            if not linkedin_urls and apollo_contacts:
                for contact in apollo_contacts:
                    if contact.get('linkedin_url'):
                        linkedin_urls.append(contact['linkedin_url'])
                        break
            
            if not linkedin_urls:
                logger.info(f"No LinkedIn URLs found for CampaignResult {cr.id}, skipping scraping.")
            else:
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
            
            publish_campaign_progress(campaign)
            time.sleep(1)

        # Transition to AI Insights Generation
        log_campaign_event(campaign, 'LinkedIn Scraping stage completed successfully.')
        campaign.stage = 'ai_insights'
        campaign.save(update_fields=['stage'])
        logger.info(f"Campaign {campaign.campaign_id} transitioning to AI Insights.")
        publish_campaign_progress(campaign)
        log_campaign_event(campaign, 'Starting AI Insights Generation and Email Copywriting stage.')
        
        campaign_insights_stage_task.delay(campaign_id)

    except Exception as e:
        logger.error(f"Error in campaign_linkedin_stage_task for Campaign {campaign_id}: {e}")
        self.retry(exc=e)
    finally:
        cache.delete(lock_id)

@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def campaign_insights_stage_task(self, campaign_id: int):
    lock_id = f"lock_camp_insights_{campaign_id}"
    if not cache.add(lock_id, "locked", timeout=1200):
        logger.info(f"Task already running for {lock_id}. Skipping duplicate.")
        return
        
    try:
        campaign = Campaign.objects.get(id=campaign_id)
        
        pending_results = CampaignResult.objects.filter(
            campaign_id=campaign_id,
            is_insights_processed__isnull=True,
            is_linkedin_processed=True,
            qualification_status='qualified'
        ).order_by('id')

        ai_client = AIClient()

        for cr in pending_results:
            logger.info(f"Starting AI Insights generation for CampaignResult {cr.id}")
            
            ai_data = cr.ai_clean_data or {}
            
            # Generate insights
            insights = ai_client.generate_insights(ai_data)
            ai_data['insights'] = insights
            
            # Generate email draft
            email_draft = ai_client.generate_email_draft(ai_data, insights)
            ai_data['email_draft'] = email_draft
            
            cr.ai_clean_data = ai_data
            cr.is_insights_processed = True
            cr.save(update_fields=['ai_clean_data', 'is_insights_processed'])
            
            # Now sync to CRM finally
            LeadImportAgent.run_single_from_ai(cr)
            publish_campaign_progress(campaign)
            
            # Small delay for local LLMs
            time.sleep(1)

        # All done
        campaign.stage = 'completed'
        campaign.status = 'completed'
        campaign.save(update_fields=['stage', 'status'])
        log_campaign_event(campaign, 'AI Insights Generation completed. Campaign processing is now 100% complete.', level='success')
        logger.info(f"Campaign {campaign.campaign_id} fully completed.")
        publish_campaign_progress(campaign)

    except Exception as e:
        logger.error(f"Error in campaign_insights_stage_task for Campaign {campaign_id}: {e}")
        self.retry(exc=e)
    finally:
        cache.delete(lock_id)
