import logging
from celery import shared_task
from django.core.cache import cache
from apps.lead_hunter.models import CampaignResult, Campaign
from services.events import publish_campaign_progress, log_campaign_event
from services.firecrawl_client import FirecrawlClient
from services.ai_client import AIClient
from agents.import_agent import LeadImportAgent

logger = logging.getLogger(__name__)

# Firecrawl Free /crawl rate limit: 2 req/min (1 per 30s).
# We use a 35s buffer (30s + 5s safety margin) to guarantee 0% 429 rate limit errors.
# We use Celery ETA re-scheduling instead of time.sleep() so workers aren't blocked.
FIRECRAWL_RATE_LIMIT_SECONDS = 35

@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def campaign_scrape_stage_task(self, campaign_id: int):
    # Processes ONE pending lead per task invocation, then re-queues itself with
    # a countdown to respect the Firecrawl rate limit. This frees the Celery worker
    # between scrapes instead of blocking it with time.sleep().

    try:
        campaign = Campaign.objects.get(id=campaign_id)

        # Ensure we are in the processing stage
        campaign.stage = 'processing'
        campaign.save(update_fields=['stage'])
        publish_campaign_progress(campaign)
        log_campaign_event(campaign, 'Starting Lead-by-Lead Processing (Firecrawl → LLM → CRM).')

        # Process only the NEXT unscraped lead (one per task invocation)
        # The task re-queues itself with a countdown after each scrape.
        cr = CampaignResult.objects.filter(
            campaign_id=campaign_id,
            is_website_scraped__isnull=True,
            qualification_status='qualified'
        ).order_by('id').first()

        if not cr:
            # No more pending — check if campaign is fully done
            check_campaign_completion(campaign_id)
            return

        if not cr.website:
            from apps.crm.models import LeadQualificationSettings
            settings = LeadQualificationSettings.get_settings()
            if settings.require_website:
                logger.warning(f"CampaignResult {cr.id} has no website to scrape and website is required.")
                cr.is_website_scraped = False
                cr.qualification_status = 'unqualified'
                ai_data = cr.ai_clean_data or {}
                ai_data["is_ideal_customer"] = False
                ai_data["qualification_reasoning"] = "Lead Rejected: No website found for scraping."
                cr.ai_clean_data = ai_data
                cr.save(update_fields=['is_website_scraped', 'qualification_status', 'ai_clean_data'])
                
                # Send to CRM immediately and trigger completion check
                LeadImportAgent.run_single_from_ai(cr)
                publish_campaign_progress(campaign)
            else:
                logger.info(f"CampaignResult {cr.id} has no website, but require_website is False. Skipping scrape and dispatching LLM task.")
                cr.is_website_scraped = False
                cr.save(update_fields=['is_website_scraped'])
                process_single_lead_task.delay(cr.id)
                publish_campaign_progress(campaign)

            # Re-queue next lead immediately (no rate-limit countdown needed since no scrape was performed)
            remaining = CampaignResult.objects.filter(
                campaign_id=campaign_id,
                is_website_scraped__isnull=True,
                qualification_status='qualified'
            ).count()
            if remaining > 0:
                campaign_scrape_stage_task.apply_async(args=[campaign_id], countdown=1)
            else:
                check_campaign_completion(campaign_id)
            return

        client = FirecrawlClient()
        logger.info(f"Starting web scrape for CampaignResult {cr.id} at {cr.website}")
        result = client.crawl_website(cr.website)

        if result and not result.get('error'):
            cr.firecrawl_raw_data = result
            cr.is_website_scraped = True
            cr.save(update_fields=['firecrawl_raw_data', 'is_website_scraped'])
            logger.info(f"Successfully saved scrape data for CampaignResult {cr.id}")

            # Immediately trigger LLM processing for this lead async
            process_single_lead_task.delay(cr.id)
        else:
            error_msg = result.get('error', 'Unknown Error') if result else 'No response'
            logger.error(f"Firecrawl scrape failed for CampaignResult {cr.id}: {error_msg}")

            if "Rate limit" in error_msg or "rate limit" in error_msg:
                logger.info(f"Rate limit hit for campaign {campaign_id} — re-queuing with longer delay")
                # Do NOT mark is_website_scraped=False; keep None so it is retried
                campaign_scrape_stage_task.apply_async(args=[campaign_id], countdown=90)
                return
            else:
                cr.is_website_scraped = False
                cr.qualification_status = 'unqualified'
                ai_data = cr.ai_clean_data or {}
                ai_data["is_ideal_customer"] = False
                ai_data["qualification_reasoning"] = f"Lead Rejected: Website scraping failed ({error_msg})."
                cr.ai_clean_data = ai_data
                cr.save(update_fields=['is_website_scraped', 'qualification_status', 'ai_clean_data'])

                LeadImportAgent.run_single_from_ai(cr)
                check_campaign_completion(campaign_id)

        publish_campaign_progress(campaign)

        # Re-queue for the next lead after rate-limit window (no time.sleep — worker is freed!)
        remaining = CampaignResult.objects.filter(
            campaign_id=campaign_id,
            is_website_scraped__isnull=True,
            qualification_status='qualified'
        ).count()
        if remaining > 0:
            logger.info(f"Scheduling next scrape for campaign {campaign_id} in {FIRECRAWL_RATE_LIMIT_SECONDS}s ({remaining} leads left)")
            campaign_scrape_stage_task.apply_async(args=[campaign_id], countdown=FIRECRAWL_RATE_LIMIT_SECONDS)
        else:
            check_campaign_completion(campaign_id)

    except Exception as e:
        logger.error(f"Error in campaign_scrape_stage_task for Campaign {campaign_id}: {e}")
        if self.request.retries >= self.max_retries:
            logger.critical(f"campaign_scrape_stage_task exceeded max retries for Campaign {campaign_id}: {e}")
            check_campaign_completion(campaign_id)
            return
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=15, default_retry_delay=15, acks_late=True)
def poll_lead_linkedin_enrichment_task(self, cr_id: int):
    """
    Asynchronously poll Nexus for a lead's LinkedIn profile and post scrape results.
    When ready, attaches the data to CampaignResult and triggers process_single_lead_task.
    Max retries: 15 × 15s = ~3.75 minutes.
    """
    from services.nexus_client import nexus_client

    try:
        cr = CampaignResult.objects.get(id=cr_id)
        campaign = cr.campaign
        raw = cr.raw_data or {}
        ai_data = cr.ai_clean_data or {}

        profile_cid = raw.get('nexus_linkedin_profile_cid')
        posts_cid = raw.get('nexus_linkedin_post_cid')

        profile_ready = not bool(profile_cid)
        posts_ready = not bool(posts_cid)

        # Check profile campaign status
        if profile_cid:
            st = nexus_client.get_campaign_status(profile_cid)
            status = st.get('status', '').upper()
            if status == 'COMPLETED':
                profile_ready = True
                leads = nexus_client.get_campaign_leads(profile_cid).get('leads', [])
                if leads:
                    raw['nexus_linkedin_profile'] = leads[0]
                    ai_data['decision_maker_linkedin'] = leads[0]
            elif status in ('FAILED', 'ABORTED', 'CANCELLED'):
                profile_ready = True
                logger.warning(f"Nexus LinkedIn profile campaign {profile_cid} failed: {st.get('error_message')}")

        # Check posts campaign status
        if posts_cid:
            st = nexus_client.get_campaign_status(posts_cid)
            status = st.get('status', '').upper()
            if status == 'COMPLETED':
                posts_ready = True
                posts_res = nexus_client.get_campaign_leads(posts_cid)
                leads = posts_res.get('posts') or posts_res.get('leads', [])
                if leads:
                    raw['nexus_linkedin_posts'] = leads
                    ai_data['decision_maker_recent_posts'] = leads
            elif status in ('FAILED', 'ABORTED', 'CANCELLED'):
                posts_ready = True
                logger.warning(f"Nexus LinkedIn posts campaign {posts_cid} failed: {st.get('error_message')}")

        if profile_ready and posts_ready:
            logger.info(f"Nexus LinkedIn enrichment finished for CampaignResult {cr.id}")
            cr.raw_data = raw
            cr.ai_clean_data = ai_data
            cr.is_linkedin_processed = True
            cr.save(update_fields=['raw_data', 'ai_clean_data', 'is_linkedin_processed'])
            publish_campaign_progress(campaign)

            # Persist to global LinkedIn deduplication cache for future leads/campaigns
            try:
                from apps.enrichment.linkedin_service import save_linkedin_cache
                target_li_url = (
                    raw.get('linkedin') or
                    raw.get('personal_linkedin') or
                    raw.get('contact_linkedin') or
                    raw.get('company_linkedin') or
                    ''
                )
                if target_li_url:
                    save_linkedin_cache(
                        original_url=target_li_url,
                        profile_data=raw.get('nexus_linkedin_profile') or {},
                        posts_data=raw.get('nexus_linkedin_posts') or [],
                        status='completed',
                        profile_cid=profile_cid,
                        posts_cid=posts_cid,
                        person_name=cr.name or '',
                    )
            except Exception as cache_err:
                logger.warning(f"Failed to save LinkedIn cache in polling task for CR {cr.id}: {cache_err}")

            # Resume processing (insights & email generation)
            process_single_lead_task.delay(cr.id)
            return

        # Still running — retry in 15 seconds
        raise self.retry(countdown=15)

    except self.MaxRetriesExceededError:
        logger.warning(f"Max retries exceeded polling LinkedIn enrichment for CR {cr_id}, proceeding gracefully")
        try:
            cr = CampaignResult.objects.get(id=cr_id)
            cr.is_linkedin_processed = False
            cr.save(update_fields=['is_linkedin_processed'])
            from apps.enrichment.linkedin_service import save_linkedin_cache
            raw = cr.raw_data or {}
            target_li_url = raw.get('linkedin') or raw.get('personal_linkedin') or raw.get('contact_linkedin') or raw.get('company_linkedin')
            if target_li_url:
                save_linkedin_cache(original_url=target_li_url, status='failed', person_name=cr.name or '')
            process_single_lead_task.delay(cr.id)
        except Exception:
            pass

    except Exception as exc:
        if isinstance(exc, self.MaxRetriesExceededError):
            raise
        logger.error(f"Error in poll_lead_linkedin_enrichment_task for CR {cr_id}: {exc}")
        raise self.retry(exc=exc, countdown=15)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True)
def process_single_lead_task(self, cr_id: int):
    """
    End-to-End Processing for a single lead.
    Runs LLM Qualification -> Nexus LinkedIn Scraping -> AI Insights & Email -> CRM Sync.
    If the lead is rejected at LLM stage, it syncs immediately as unqualified.
    """
    try:
        cr = CampaignResult.objects.get(id=cr_id)
        campaign = cr.campaign

        # We only process if it hasn't been completely synced yet
        if cr.is_crm_synced is not None:
            return

        # Atomic Redis Lock per CampaignResult to guarantee 0% duplication across parallel AI workers
        lock_key = f"lock:process_cr:{cr_id}"
        if not cache.add(lock_key, "active", timeout=180):
            logger.warning(f"CampaignResult {cr_id} is already actively being processed by another worker. Skipping duplicate.")
            return

        ai_client = AIClient()

        # ==========================================
        # STAGE 1: LLM Processing & Qualification
        # ==========================================
        if cr.is_llm_processed is None:
            logger.info(f"Starting LLM consolidation & qualification for CampaignResult {cr.id}")
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
                    # Reject early — skip LinkedIn & insights generation to save API calls
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
        # STAGE 1.5: Nexus LinkedIn Scraping (Profile & Posts)
        # (Only for AI-qualified leads)
        # ==========================================
        if cr.is_linkedin_processed is None:
            raw = cr.raw_data or {}
            linkedin_url = (
                raw.get('linkedin') or
                raw.get('personal_linkedin') or
                raw.get('contact_linkedin') or
                None
            )
            # Check decision maker lists if direct field isn't set
            if not linkedin_url:
                contacts = raw.get('decision_makers') or raw.get('contacts') or []
                if isinstance(contacts, list):
                    for c in contacts:
                        if isinstance(c, dict) and c.get('linkedin'):
                            linkedin_url = c.get('linkedin')
                            break
            # Check linkedIns list (e.g. from scrapers)
            if not linkedin_url and isinstance(raw.get('linkedIns'), list) and raw['linkedIns']:
                linkedin_url = raw['linkedIns'][0]
            # Fallback to company_linkedin
            if not linkedin_url:
                linkedin_url = raw.get('company_linkedin') or raw.get('company_linkedin_url')

            if linkedin_url and isinstance(linkedin_url, str) and 'linkedin.com' in linkedin_url.lower():
                from apps.enrichment.linkedin_service import get_cached_linkedin_profile, save_linkedin_cache

                # ── Layer 1: Check if already enriched in this lead's own raw data
                existing_profile = raw.get('nexus_linkedin_profile')
                existing_posts = raw.get('nexus_linkedin_posts')
                if existing_profile or existing_posts:
                    logger.info(f"CR {cr.id} already has LinkedIn profile/posts in raw_data. Skipping Nexus dispatch.")
                    cr.is_linkedin_processed = True
                    cr.save(update_fields=['is_linkedin_processed'])
                    # Fall through to Stage 2 directly

                else:
                    # ── Layer 2: Check global deduplication cache across entire DB
                    cached = get_cached_linkedin_profile(linkedin_url)

                    if cached and cached.get('status') == 'completed' and (cached.get('profile') or cached.get('posts')):
                        logger.info(
                            f"[DEDUP BENEFIT] LinkedIn data for {linkedin_url} already exists in DB! "
                            f"Reusing cached profile & {len(cached.get('posts', []))} posts. Nexus charge saved ($0.009 USD)!"
                        )
                        raw['nexus_linkedin_profile'] = cached.get('profile') or {}
                        raw['nexus_linkedin_posts'] = cached.get('posts') or []
                        ai_data = cr.ai_clean_data or {}
                        ai_data['decision_maker_linkedin'] = cached.get('profile') or {}
                        ai_data['decision_maker_recent_posts'] = cached.get('posts') or []
                        cr.raw_data = raw
                        cr.ai_clean_data = ai_data
                        cr.is_linkedin_processed = True
                        cr.save(update_fields=['raw_data', 'ai_clean_data', 'is_linkedin_processed'])

                        log_campaign_event(
                            campaign,
                            f"Reused cached LinkedIn profile & posts for {cr.name or cr.place_id} (Deduplicated — Nexus charge saved!).",
                            level='info'
                        )
                        publish_campaign_progress(campaign)
                        # Fall through to STAGE 2 directly (no delay, no Nexus polling!)

                    elif cached and cached.get('status') == 'in_progress':
                        # Another task is currently polling this exact same URL! Attach and wait.
                        logger.info(f"LinkedIn scrape for {linkedin_url} already in-progress. Attaching to existing campaign.")
                        raw['nexus_linkedin_profile_cid'] = cached.get('profile_cid')
                        raw['nexus_linkedin_post_cid'] = cached.get('posts_cid')
                        cr.raw_data = raw
                        cr.save(update_fields=['raw_data'])
                        poll_lead_linkedin_enrichment_task.apply_async(args=[cr.id], countdown=15)
                        return

                    else:
                        # ── Layer 3: Truly new URL — dispatch to Nexus
                        from services.nexus_client import nexus_client
                        logger.info(f"Triggering Nexus LinkedIn enrichment for CampaignResult {cr.id} at {linkedin_url}")
                        try:
                            # Pre-register cache entry as in_progress to block concurrent duplicate dispatches
                            save_linkedin_cache(
                                original_url=linkedin_url,
                                status='in_progress',
                                person_name=cr.name or '',
                            )

                            profile_res = nexus_client.scrape_linkedin_profiles([linkedin_url], file_name=f"CR-{cr.id} Profile")
                            posts_res = nexus_client.scrape_linkedin_posts([linkedin_url], fetch_count=3, file_name=f"CR-{cr.id} Posts")

                            profile_cid = profile_res.get('campaign_id')
                            posts_cid = posts_res.get('campaign_id')

                            if not profile_cid and not posts_cid:
                                logger.warning(f"Nexus did not return campaign IDs for CR {cr.id}: profile={profile_res}, posts={posts_res}")
                                cr.is_linkedin_processed = False
                                cr.save(update_fields=['is_linkedin_processed'])
                                save_linkedin_cache(original_url=linkedin_url, status='failed', person_name=cr.name or '')
                            else:
                                raw['nexus_linkedin_profile_cid'] = profile_cid
                                raw['nexus_linkedin_post_cid'] = posts_cid
                                cr.raw_data = raw
                                cr.save(update_fields=['raw_data'])

                                # Update cache entry with the active campaign IDs
                                save_linkedin_cache(
                                    original_url=linkedin_url,
                                    status='in_progress',
                                    profile_cid=profile_cid,
                                    posts_cid=posts_cid,
                                    person_name=cr.name or '',
                                )

                                if campaign.stage != 'linkedin_scraping':
                                    campaign.stage = 'linkedin_scraping'
                                    campaign.save(update_fields=['stage'])
                                log_campaign_event(campaign, f"Triggered Nexus LinkedIn profile and posts scraping for {cr.name or cr.place_id}.")
                                publish_campaign_progress(campaign)

                                # Schedule asynchronous polling and yield worker
                                poll_lead_linkedin_enrichment_task.apply_async(args=[cr.id], countdown=15)
                                return
                        except Exception as li_dispatch_err:
                            logger.warning(f"Failed to dispatch Nexus LinkedIn enrichment for CR {cr.id}: {li_dispatch_err}")
                            cr.is_linkedin_processed = False
                            cr.save(update_fields=['is_linkedin_processed'])
                            save_linkedin_cache(original_url=linkedin_url, status='failed', person_name=cr.name or '')
            else:
                cr.is_linkedin_processed = False
                cr.save(update_fields=['is_linkedin_processed'])

        # ==========================================
        # STAGE 2: AI Strategic Insights & Cold Email Generation
        # (Only for AI-qualified leads)
        # ==========================================
        if cr.is_insights_processed is None:
            logger.info(f"Starting AI Insights & Cold Email generation for CampaignResult {cr.id}")
            ai_data = cr.ai_clean_data or {}
            
            insights = ai_client.generate_insights(ai_data)
            ai_data['insights'] = insights
            
            email_draft = ai_client.generate_email_draft(ai_data, insights)
            ai_data['email_draft'] = email_draft
            
            cr.ai_clean_data = ai_data
            cr.is_insights_processed = True
            cr.save(update_fields=['ai_clean_data', 'is_insights_processed'])

        # ==========================================
        # STAGE 3: Final CRM Ingestion & Entity Linking
        # ==========================================
        LeadImportAgent.run_single_from_ai(cr)
        check_campaign_completion(campaign.id)
        
    except Exception as e:
        logger.error(f"Error in process_single_lead_task for CR {cr_id}: {e}")
        if self.request.retries >= self.max_retries:
            logger.critical(
                f"process_single_lead_task exceeded max retries ({self.max_retries}) for CR {cr_id}. "
                f"Gracefully finalizing lead as unqualified to prevent stalled pipeline."
            )
            try:
                cr = CampaignResult.objects.get(id=cr_id)
                cr.is_crm_synced = False
                cr.qualification_status = 'unqualified'
                ai_data = cr.ai_clean_data or {}
                ai_data['is_ideal_customer'] = False
                ai_data['qualification_reasoning'] = f"Lead processing aborted after {self.max_retries} attempts: {e}"
                cr.ai_clean_data = ai_data
                cr.save(update_fields=['is_crm_synced', 'qualification_status', 'ai_clean_data'])

                try:
                    LeadImportAgent.run_single_from_ai(cr)
                except Exception as import_err:
                    logger.error(f"Fallback import failed for CR {cr_id}: {import_err}")

                check_campaign_completion(cr.campaign_id)
            except Exception as final_err:
                logger.error(f"Error during final fallback for CR {cr_id}: {final_err}")
            return
        raise self.retry(exc=e)
    finally:
        cache.delete(f"lock:process_cr:{cr_id}")

def check_campaign_completion(campaign_id: int):
    """
    Checks if all CampaignResults for a campaign have been processed.
    If yes, marks the campaign as fully completed.
    Uses database row-level locking (select_for_update) inside an atomic transaction
    to prevent race conditions between concurrent workers.
    """
    from django.db import transaction
    try:
        with transaction.atomic():
            try:
                campaign = Campaign.objects.select_for_update().get(id=campaign_id)
            except Campaign.DoesNotExist:
                return

            # If campaign is already completed or failed, do nothing
            if campaign.status in ['completed', 'failed']:
                return

            # Check if there are any results at all for this campaign
            total_results = CampaignResult.objects.filter(campaign_id=campaign.id).count()
            if total_results == 0:
                # Campaign is still scraping / pending or has no results yet
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
