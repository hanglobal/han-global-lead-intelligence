import logging
from apps.lead_hunter.models import CampaignResult
from agents.qualification_agent import LeadQualificationAgent
from agents.import_agent import LeadImportAgent
from apps.enrichment.tasks import campaign_scrape_stage_task, campaign_llm_stage_task, campaign_apollo_stage_task, campaign_linkedin_stage_task, campaign_insights_stage_task

logger = logging.getLogger(__name__)

def resume_campaign_pipeline(campaign):
    """
    Idempotent pipeline trigger for a campaign.
    Starts the sequential batch processing pipeline.
    """
    logger.info(f"Resuming sequential pipeline for campaign {campaign.campaign_id}")
    started_tasks = False

    # 1. Basic Qualification (Run on all pending)
    pending_qual = CampaignResult.objects.filter(campaign_id=campaign.id, qualification_status='pending')
    if pending_qual.exists():
        campaign.stage = 'basic_qualification'
        campaign.save(update_fields=['stage'])
        LeadQualificationAgent.run(pending_qual)
        started_tasks = True

    # 2. Sync Unqualified directly to CRM
    unqualified = CampaignResult.objects.filter(
        campaign_id=campaign.id, 
        qualification_status='unqualified',
        is_crm_synced__isnull=True
    )
    if unqualified.exists():
        LeadImportAgent.run_unqualified(unqualified)
        started_tasks = True

    # 3. Firecrawl Scrape - Batch Stage
    # If there are leads that need scraping, kick off the scraping campaign task
    pending_scrape = CampaignResult.objects.filter(
        campaign_id=campaign.id, 
        qualification_status='qualified',
        is_website_scraped__isnull=True
    )
    if pending_scrape.exists():
        if campaign.stage not in ['website_scraping', 'llm_processing', 'apollo_enrichment', 'ai_insights']:
            campaign.stage = 'website_scraping'
            campaign.save(update_fields=['stage'])
        
        logger.info(f"Triggering campaign scrape stage task for campaign {campaign.campaign_id}")
        campaign_scrape_stage_task.delay(campaign.id)
        started_tasks = True

    # 4. LLM Processing - Batch Stage
    # If there are no pending scrapes, but pending LLM, and the stage is at least llm_processing (meaning scrape is fully done or skipped)
    if not pending_scrape.exists():
        pending_llm = CampaignResult.objects.filter(
            campaign_id=campaign.id,
            qualification_status='qualified',
            is_llm_processed__isnull=True
        )
        if pending_llm.exists() and campaign.stage in ['llm_processing', 'website_scraping', 'basic_qualification']:
            campaign.stage = 'llm_processing'
            campaign.save(update_fields=['stage'])
            
            logger.info(f"Triggering campaign LLM stage task for campaign {campaign.campaign_id}")
            campaign_llm_stage_task.delay(campaign.id)
            started_tasks = True

    # 5. Apollo Enrichment - Batch Stage
    if not pending_scrape.exists():
        pending_llm_check = CampaignResult.objects.filter(
            campaign_id=campaign.id,
            qualification_status='qualified',
            is_llm_processed__isnull=True
        )
        if not pending_llm_check.exists():
            pending_apollo = CampaignResult.objects.filter(
                campaign_id=campaign.id,
                qualification_status='qualified',
                is_apollo_processed__isnull=True,
                is_llm_processed=True
            )
            if pending_apollo.exists():
                campaign.stage = 'apollo_enrichment'
                campaign.save(update_fields=['stage'])
                
                logger.info(f"Triggering campaign Apollo stage task for campaign {campaign.campaign_id}")
                campaign_apollo_stage_task.delay(campaign.id)
                started_tasks = True

    # 6. LinkedIn Scraping - Batch Stage
    if not pending_scrape.exists():
        pending_llm_check = CampaignResult.objects.filter(
            campaign_id=campaign.id,
            qualification_status='qualified',
            is_llm_processed__isnull=True
        )
        if not pending_llm_check.exists():
            pending_apollo_check = CampaignResult.objects.filter(
                campaign_id=campaign.id,
                qualification_status='qualified',
                is_apollo_processed__isnull=True,
                is_llm_processed=True
            )
            if not pending_apollo_check.exists():
                pending_linkedin = CampaignResult.objects.filter(
                    campaign_id=campaign.id,
                    qualification_status='qualified',
                    is_linkedin_processed__isnull=True,
                    is_apollo_processed=True
                )
                if pending_linkedin.exists():
                    campaign.stage = 'linkedin_scraping'
                    campaign.save(update_fields=['stage'])
                    
                    logger.info(f"Triggering campaign linkedin stage task for campaign {campaign.campaign_id}")
                    campaign_linkedin_stage_task.delay(campaign.id)
                    started_tasks = True

    # 7. AI Insights Generation - Batch Stage
    if not pending_scrape.exists():
        pending_llm_check = CampaignResult.objects.filter(
            campaign_id=campaign.id,
            qualification_status='qualified',
            is_llm_processed__isnull=True
        )
        if not pending_llm_check.exists():
            pending_apollo_check = CampaignResult.objects.filter(
                campaign_id=campaign.id,
                qualification_status='qualified',
                is_apollo_processed__isnull=True,
                is_llm_processed=True
            )
            if not pending_apollo_check.exists():
                pending_linkedin_check = CampaignResult.objects.filter(
                    campaign_id=campaign.id,
                    qualification_status='qualified',
                    is_linkedin_processed__isnull=True,
                    is_apollo_processed=True
                )
                if not pending_linkedin_check.exists():
                    pending_insights = CampaignResult.objects.filter(
                        campaign_id=campaign.id,
                        qualification_status='qualified',
                        is_insights_processed__isnull=True,
                        is_linkedin_processed=True
                    )
                    if pending_insights.exists():
                        campaign.stage = 'ai_insights'
                        campaign.save(update_fields=['stage'])
                        
                        logger.info(f"Triggering campaign AI insights stage task for campaign {campaign.campaign_id}")
                        campaign_insights_stage_task.delay(campaign.id)
                        started_tasks = True

    # Check if completely done
    if not started_tasks:
        in_progress = CampaignResult.objects.filter(
            campaign_id=campaign.id,
            qualification_status='qualified'
        ).exclude(
            is_llm_processed__isnull=False, 
            is_apollo_processed__isnull=False,
            is_linkedin_processed__isnull=False,
            is_insights_processed__isnull=False,
            is_crm_synced__isnull=False
        ).exists()
        
        if not in_progress:
            campaign.stage = 'completed'
            campaign.status = 'completed'
            campaign.save(update_fields=['stage', 'status'])
            logger.info(f"Campaign {campaign.campaign_id} sequential pipeline fully completed.")

    from apps.lead_hunter.views import publish_campaign_progress
    publish_campaign_progress(campaign)
