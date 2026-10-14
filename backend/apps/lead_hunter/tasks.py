import logging
from celery import shared_task
from celery.exceptions import Retry, MaxRetriesExceededError

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=60, default_retry_delay=15)
def poll_nexus_campaign_run(self, campaign_id):
    """
    Poll Nexus Data Solutions every 15s until the campaign completes.
    Downloads enriched B2B leads and kicks off the multi-stage pipeline.
    Max retries: 60 × 15s = 15 minutes.
    """
    from apps.lead_hunter.models import Campaign
    from apps.lead_hunter.services import sync_campaign_results
    from services.events import publish_campaign_update, log_campaign_event
    from services.nexus_client import nexus_client

    try:
        campaign = Campaign.objects.get(id=campaign_id)
    except Campaign.DoesNotExist:
        logger.warning(f'poll_nexus_campaign_run: campaign {campaign_id} not found — aborting')
        return

    if campaign.status not in ('running', 'pending'):
        logger.info(
            f'poll_nexus_campaign_run: campaign {campaign.campaign_id} is already {campaign.status} — stopping poll'
        )
        return

    nexus_id = campaign.nexus_campaign_id
    if not nexus_id:
        logger.error(f'poll_nexus_campaign_run: campaign {campaign.campaign_id} has no nexus_campaign_id — marking failed')
        campaign.status = 'failed'
        campaign.stage = 'failed'
        campaign.save(update_fields=['status', 'stage'])
        log_campaign_event(campaign, "No Nexus Run ID associated with this campaign. Terminated.", level='error')
        return

    try:
        status_data = nexus_client.get_campaign_status(nexus_id)
        if 'error' in status_data and not status_data.get('status'):
            logger.warning(f'poll_nexus_campaign_run rate-limited/transient error for {campaign.campaign_id}: {status_data}')
            raise self.retry(countdown=20)

        nexus_status = status_data.get('status', '').upper()
        logger.info(f'poll_nexus_campaign_run: campaign={campaign.campaign_id} nexus_status={nexus_status}')

        if nexus_status == 'COMPLETED':
            leads_data = nexus_client.get_campaign_leads(nexus_id)
            if 'error' in leads_data and not leads_data.get('leads'):
                logger.error(f"poll_nexus_campaign_run transient failure fetching leads for {campaign.campaign_id}: {leads_data}")
                raise self.retry(countdown=20)
            leads = leads_data.get('leads', [])
            
            log_campaign_event(
                campaign,
                f"Nexus extraction finished. Delivered {len(leads)} B2B decision-maker leads. Billed: ${status_data.get('billed_amount', 0)}"
            )

            stats = sync_campaign_results(campaign, leads)
            campaign.status = 'running'
            campaign.total_leads_found = stats.get('total', 0)
            campaign.stage = 'nexus_ingestion'
            campaign.billed_amount = status_data.get('billed_amount', 0.00) or 0.00
            campaign.billed_leads_count = len(leads)
            campaign.save(update_fields=['status', 'total_leads_found', 'stage', 'billed_amount', 'billed_leads_count'])
            
            publish_campaign_update(campaign, stats)
            
            if len(leads) == 0:
                campaign.status = 'completed'
                campaign.stage = 'completed'
                campaign.save(update_fields=['status', 'stage'])
                log_campaign_event(campaign, "No leads delivered by Nexus for the specified criteria. Campaign completed.", level='info')
            else:
                from apps.lead_hunter.pipeline import resume_campaign_pipeline
                resume_campaign_pipeline(campaign)

        elif nexus_status in ('FAILED', 'ABORTED', 'CANCELLED'):
            err_msg = status_data.get('error_message') or 'Nexus campaign failed'
            campaign.status = 'failed'
            campaign.stage = 'failed'
            campaign.save(update_fields=['status', 'stage'])
            log_campaign_event(campaign, f"Nexus campaign failed: {err_msg}", level='error')
            logger.error(f'poll_nexus_campaign_run: {campaign.campaign_id} failed: {err_msg}')

        else:
            # Still RUNNING -> retry in 20 seconds
            log_campaign_event(campaign, f"Nexus lead sourcing in progress... (Status: {nexus_status})")
            raise self.retry(countdown=20)

    except (MaxRetriesExceededError, Retry):
        raise

    except Exception as exc:
        logger.error(f'poll_nexus_campaign_run: unexpected error: {exc}')
        raise self.retry(exc=exc, countdown=20)

