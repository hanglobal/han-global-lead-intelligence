"""
Thin wrappers kept for backward compatibility.
All business logic now lives in services/apify.py (ApifyClient class).
"""
import logging
from django.conf import settings
from services.apify import apify as _client

logger = logging.getLogger(__name__)


def run_apify_scraper(campaign):
    """Start Apify actor for a campaign. Returns run_id."""
    backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:5050').rstrip('/')
    
    if 'localhost' in backend_url or '127.0.0.1' in backend_url:
        webhook_url = None
    else:
        webhook_url = f'{backend_url}/api/lead-hunter/webhook/apify/'

    return _client.run_actor(
        actor_type=campaign.actor_type,
        location=campaign.location,
        niche=campaign.niche,
        max_leads=campaign.lead_count,
        webhook_url=webhook_url,
    )


def fetch_apify_results(run_id):
    """Fetch results from a completed run. Returns (items, status_string)."""
    try:
        status_info = _client.get_run_status(run_id)
        if status_info['status'] not in ('SUCCEEDED', 'FINISHED'):
            return None, status_info['status']
        items = _client.get_run_results(run_id)
        return items, 'SUCCEEDED'
    except Exception as e:
        logger.error(f'fetch_apify_results error for run {run_id}: {e}')
        return None, 'ERROR'


def check_run_status(run_id):
    """Return Apify run status dict."""
    return _client.get_run_status(run_id)
