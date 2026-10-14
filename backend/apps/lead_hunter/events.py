import json
import logging
import redis
from django.conf import settings

logger = logging.getLogger(__name__)

CHANNEL_NAME = 'realtime-crm'


def get_redis_client():
    """Return a Redis client instance dynamically configured from Django settings."""
    broker_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://localhost:6379/0')
    return redis.Redis.from_url(broker_url)


def publish_campaign_update(campaign, stats):
    """Publish a real-time event to the Redis pubsub channel."""
    try:
        r = get_redis_client()
        r.publish(CHANNEL_NAME, json.dumps({
            'type': 'CAMPAIGN_COMPLETED',
            'campaign_id': campaign.campaign_id,
            'id': campaign.id,
            'status': campaign.status,
            'stage': campaign.stage,
            'total': stats.get('total', 0),
            'synced': stats.get('synced', 0),
            'batch_duplicates': stats.get('batch_duplicates', 0),
            'crm_duplicates': stats.get('crm_duplicates', 0),
            'crawled_count': campaign.results.filter(is_website_scraped=True).count(),
            'llm_processed_count': campaign.results.filter(is_llm_processed=True).count(),
            'linkedin_processed_count': campaign.results.filter(is_linkedin_processed=True).count(),
            'insights_processed_count': campaign.results.filter(is_insights_processed=True).count(),
        }))
        logger.info(f"Published real-time CAMPAIGN_COMPLETED event for {campaign.campaign_id}")
    except Exception as e:
        logger.warning(f"Failed to publish CAMPAIGN_COMPLETED event: {e}")


def publish_campaign_progress(campaign):
    """Publish a real-time progress update to the Redis pubsub channel."""
    try:
        r = get_redis_client()
        results = campaign.results.all()
        results_count = results.count()
        synced_count = results.filter(is_crm_synced=True).count()
        crawled_count = results.filter(is_website_scraped=True).count()
        llm_processed_count = results.filter(is_llm_processed=True).count()
        linkedin_processed_count = results.filter(is_linkedin_processed=True).count()
        insights_processed_count = results.filter(is_insights_processed=True).count()

        r.publish(CHANNEL_NAME, json.dumps({
            'type': 'CAMPAIGN_PROGRESS',
            'campaign_id': campaign.campaign_id,
            'id': campaign.id,
            'status': campaign.status,
            'stage': campaign.stage,
            'total_leads_found': campaign.total_leads_found,
            'results_count': results_count,
            'is_crm_synced': synced_count,
            'crawled_count': crawled_count,
            'llm_processed_count': llm_processed_count,
            'linkedin_processed_count': linkedin_processed_count,
            'insights_processed_count': insights_processed_count,
        }))
    except Exception as e:
        logger.warning(f"Failed to publish CAMPAIGN_PROGRESS event: {e}")


def log_campaign_event(campaign, message, level='info'):
    """Save a log to the database and broadcast it via SSE."""
    try:
        from apps.lead_hunter.models import CampaignLog
        log = CampaignLog.objects.create(campaign=campaign, message=message, level=level)

        r = get_redis_client()
        r.publish(CHANNEL_NAME, json.dumps({
            'type': 'CAMPAIGN_LOG',
            'campaign_id': campaign.campaign_id,
            'id': campaign.id,
            'log': {
                'message': log.message,
                'level': log.level,
                'created_at': log.created_at.isoformat(),
            }
        }))
    except Exception as e:
        logger.warning(f"Failed to save/publish CAMPAIGN_LOG: {e}")
