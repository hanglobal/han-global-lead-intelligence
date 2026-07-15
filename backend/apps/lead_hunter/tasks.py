import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=60, default_retry_delay=30)
def poll_apify_run(self, campaign_id):
    """
    Poll Apify every 30s until the run completes.

    This runs as a Celery fallback alongside the webhook.
    If the webhook fires first and marks the campaign 'completed',
    this task exits immediately without double-processing.

    Max retries: 60 × 30s = 30 minutes before giving up.
    """
    from apps.lead_hunter.models import Campaign
    from apps.lead_hunter.services import sync_campaign_results
    from apps.lead_hunter.views import publish_campaign_update
    from services.apify import apify

    try:
        campaign = Campaign.objects.get(id=campaign_id)
    except Campaign.DoesNotExist:
        logger.warning(f'poll_apify_run: campaign {campaign_id} not found — aborting')
        return

    # Webhook already finished it — nothing to do
    if campaign.status != 'running':
        logger.info(
            f'poll_apify_run: campaign {campaign.campaign_id} is already '
            f'{campaign.status} — stopping poll'
        )
        return

    if not campaign.apify_task_id:
        logger.warning(f'poll_apify_run: campaign {campaign.campaign_id} has no apify_task_id')
        return

    try:
        run_info = apify.get_run_status(campaign.apify_task_id)
        apify_status = run_info['status']
        logger.info(
            f'poll_apify_run: campaign={campaign.campaign_id} apify_status={apify_status}'
        )

        if apify_status in ('SUCCEEDED', 'FINISHED'):
            results = apify.get_run_results(campaign.apify_task_id)
            stats = sync_campaign_results(campaign, results)
            campaign.status = 'running'
            campaign.total_leads_found = stats.get('total', 0)
            campaign.save(update_fields=['status', 'total_leads_found'])
            publish_campaign_update(campaign, stats)
            
            from apps.lead_hunter.pipeline import resume_campaign_pipeline
            resume_campaign_pipeline(campaign)

        elif apify_status in ('FAILED', 'ABORTED', 'TIMED-OUT'):
            campaign.status = 'failed'
            campaign.save(update_fields=['status'])
            logger.error(
                f'poll_apify_run: {campaign.campaign_id} failed (apify_status={apify_status})'
            )

        else:
            # RUNNING or READY — retry after 30s
            raise self.retry(countdown=30)

    except self.MaxRetriesExceededError:
        campaign.status = 'failed'
        campaign.save(update_fields=['status'])
        logger.error(
            f'poll_apify_run: max retries exceeded for {campaign.campaign_id} — marking failed'
        )

    except Exception as exc:
        logger.error(f'poll_apify_run: unexpected error: {exc}')
        raise self.retry(exc=exc, countdown=30)
