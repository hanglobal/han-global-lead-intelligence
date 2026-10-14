import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def score_pending_leads(self, depth=0):
    """Score unscored/under-scored leads in batches of 100.

    Delegates to LeadScoreAgent; re-queues itself if more remain so that
    all leads get scored safely without blocking the request cycle.
    Circuit breaker: stops after 50 iterations (5000 leads) to prevent infinite loops.
    """
    MAX_DEPTH = 50  # 50 × 100 = 5000 leads max per invocation chain

    from agents.score_agent import LeadScoreAgent
    from agents.qualification_agent import LeadQualificationAgent

    result = LeadScoreAgent.run()

    # After scoring, run qualification on new leads
    qual_result = LeadQualificationAgent.run()
    result['qualified'] = qual_result['qualified']

    if result['remaining'] > 0:
        if depth >= MAX_DEPTH:
            logger.warning(
                f"score_pending_leads: hit max depth ({MAX_DEPTH}). "
                f"{result['remaining']} leads still unscored. Stopping to prevent infinite loop."
            )
        elif result.get('scored', 0) == 0 and result['remaining'] > 0:
            logger.warning(
                f"score_pending_leads: scored 0 leads but {result['remaining']} remain. "
                f"Possible scoring failure — stopping to prevent infinite loop."
            )
        else:
            score_pending_leads.delay(depth=depth + 1)

    return result


@shared_task
def sweep_stuck_leads():
    """
    Dead-letter recovery: finds CampaignResults and Campaigns stuck in a partial pipeline state
    for more than 2 hours and re-triggers their processing.

    Scheduled to run every 30 minutes via Celery beat (configured in settings.py).

    Stuck states recovered:
    - Case 1: is_llm_processed=True, is_crm_synced=None  -> LLM done but CRM sync never happened
    - Case 2: is_website_scraped=None, qualification_status='qualified', created 2h+ ago -> scrape never started
    - Case 3: is_website_scraped is not None, is_llm_processed=None, is_crm_synced=None -> scraped but LLM crashed/stalled
    - Case 4: Campaign stuck in 'running' but all results have finished processing -> finalize campaign
    """
    from apps.lead_hunter.models import CampaignResult, Campaign
    from apps.enrichment.tasks import (
        process_single_lead_task,
        campaign_scrape_stage_task,
        check_campaign_completion,
    )

    cutoff = timezone.now() - timedelta(hours=2)
    recovered = 0

    # Case 1: LLM processed but never synced to CRM
    stuck_post_llm = CampaignResult.objects.filter(
        is_llm_processed=True,
        is_crm_synced__isnull=True,
        updated_at__lt=cutoff
    )
    for cr in stuck_post_llm:
        logger.warning(
            f"sweep_stuck_leads [Case 1]: re-triggering CRM sync for stuck CR {cr.id} "
            f"(campaign {cr.campaign.campaign_id})"
        )
        process_single_lead_task.delay(cr.id)
        recovered += 1

    # Case 2: Qualified but website scraping never started
    stuck_campaigns = CampaignResult.objects.filter(
        qualification_status='qualified',
        is_website_scraped__isnull=True,
        is_crm_synced__isnull=True,
        updated_at__lt=cutoff
    ).values_list('campaign_id', flat=True).distinct()

    for campaign_id in stuck_campaigns:
        logger.warning(f"sweep_stuck_leads [Case 2]: re-triggering scrape stage for stuck campaign {campaign_id}")
        campaign_scrape_stage_task.delay(campaign_id)
        recovered += 1

    # Case 3: Scraped but LLM processing never executed or stalled
    stuck_post_scrape = CampaignResult.objects.filter(
        qualification_status='qualified',
        is_website_scraped__isnull=False,
        is_llm_processed__isnull=True,
        is_crm_synced__isnull=True,
        updated_at__lt=cutoff
    )
    for cr in stuck_post_scrape:
        logger.warning(
            f"sweep_stuck_leads [Case 3]: re-triggering LLM processing for scraped CR {cr.id} "
            f"(campaign {cr.campaign.campaign_id})"
        )
        process_single_lead_task.delay(cr.id)
        recovered += 1

    # Case 4: Running campaigns with all leads processed but completion check never ran
    running_campaigns = Campaign.objects.filter(status='running', updated_at__lt=cutoff)
    for camp in running_campaigns:
        pending = CampaignResult.objects.filter(campaign_id=camp.id, is_crm_synced__isnull=True).count()
        if pending == 0:
            logger.warning(f"sweep_stuck_leads [Case 4]: finalizing stalled completed campaign {camp.campaign_id}")
            check_campaign_completion(camp.id)
            recovered += 1

    if recovered:
        logger.info(f"sweep_stuck_leads: recovered {recovered} stuck leads/campaigns")
    else:
        logger.debug("sweep_stuck_leads: no stuck leads found")

    return {'recovered': recovered}
