import logging
from apps.lead_hunter.models import CampaignResult
from agents.qualification_agent import LeadQualificationAgent
from agents.import_agent import LeadImportAgent
from apps.enrichment.tasks import campaign_scrape_stage_task, check_campaign_completion

logger = logging.getLogger(__name__)

def resume_campaign_pipeline(campaign):
    """
    Idempotent pipeline trigger for a campaign.
    Starts the sequential scraping which then fans out to async lead-by-lead processing.
    """
    logger.info(f"Resuming pipeline for campaign {campaign.campaign_id}")

    # 1. Basic Qualification (Run on all pending)
    pending_qual = CampaignResult.objects.filter(campaign_id=campaign.id, qualification_status='pending')
    if pending_qual.exists():
        campaign.stage = 'basic_qualification'
        campaign.save(update_fields=['stage'])
        LeadQualificationAgent.run(pending_qual)

    # 2. Sync Unqualified directly to CRM
    unqualified = CampaignResult.objects.filter(
        campaign_id=campaign.id, 
        qualification_status='unqualified',
        is_crm_synced__isnull=True
    )
    if unqualified.exists():
        LeadImportAgent.run_unqualified(unqualified)

    # 3. Firecrawl Scrape - Triggers the rest of the Lead-by-Lead pipeline
    pending_scrape = CampaignResult.objects.filter(
        campaign_id=campaign.id, 
        qualification_status='qualified',
        is_website_scraped__isnull=True
    )
    if pending_scrape.exists():
        if campaign.stage != 'processing':
            campaign.stage = 'processing'
            campaign.save(update_fields=['stage'])
        
        logger.info(f"Triggering campaign scrape stage task for campaign {campaign.campaign_id}")
        campaign_scrape_stage_task.delay(campaign.id)
    else:
        # If no pending scrapes, the async tasks might still be running for other leads.
        # We can just call check_campaign_completion to see if it's completely done.
        check_campaign_completion(campaign.id)

    from apps.lead_hunter.views import publish_campaign_progress
    publish_campaign_progress(campaign)
