"""
Apify service client — Phase 3.
Supports three actors: gmap, web_scraper, linkedin.
Actor IDs resolved from settings/env.
"""
import logging
from django.conf import settings
from apify_client import ApifyClient as _ApifySDKClient

logger = logging.getLogger(__name__)


def _get_sdk_client():
    api_key = getattr(settings, 'APIFY_API_KEY', '')
    if not api_key or api_key == 'your-apify-api-key-here':
        raise ValueError('APIFY_API_KEY is not configured. Set it in your .env file.')
    return _ApifySDKClient(api_key)


def _get_actor_id(actor_type):
    mapping = {
        'gmap':        getattr(settings, 'APIFY_ACTOR_GMAP', ''),
        'linkedin':    getattr(settings, 'APIFY_ACTOR_LINKEDIN', ''),
    }
    actor_id = mapping.get(actor_type, '')
    if not actor_id:
        raise ValueError(
            f"No actor ID configured for actor_type='{actor_type}'. "
            f"Set APIFY_ACTOR_{actor_type.upper()} in your .env file."
        )
    return actor_id


def _build_actor_input(actor_type, location, niche, max_leads=None):
    if actor_type == 'gmap':
        payload = {
            "includeWebResults": False,
            "language": "en",
            "locationQuery": location,
            "maxImages": 0,
            "maximumLeadsEnrichmentRecords": 0,
            "scrapeContacts": False,
            "scrapeDirectories": False,
            "scrapeImageAuthors": False,
            "scrapeOrderOnline": False,
            "scrapePlaceDetailPage": True,
            "scrapeReviewsPersonalData": False,
            "scrapeSocialMediaProfiles": {
                "facebooks": False,
                "instagrams": False,
                "tiktoks": False,
                "twitters": False,
                "youtubes": False
            },
            "scrapeTableReservationProvider": False,
            "searchStringsArray": [niche],
            "skipClosedPlaces": False,
            "verifyLeadsEnrichmentEmails": False,
            "searchMatching": "all",
            "placeMinimumStars": "",
            "website": "allPlaces",
            "maxQuestions": 0,
            "maxReviews": 0,
            "reviewsSort": "newest",
            "reviewsFilterString": "",
            "reviewsOrigin": "all",
            "allPlacesNoSearchAction": ""
        }
        if max_leads and int(max_leads) > 0:
            payload['maxCrawledPlacesPerSearch'] = int(max_leads)
        return payload
    if actor_type == 'linkedin':
        return {'searchQuery': f'{niche} {location}', 'maxResults': int(max_leads or 50)}
    raise ValueError(f"Unknown actor_type: '{actor_type}'.")


class ApifyClient:
    """
    Clean 3-method interface over the Apify SDK.

    run_actor()      → starts run, returns run_id
    get_run_status() → returns status dict
    get_run_results()→ returns raw lead list
    """

    def run_actor(self, actor_type, location, niche, max_leads=None, webhook_url=None):
        actor_id = _get_actor_id(actor_type)
        client = _get_sdk_client()
        run_input = _build_actor_input(actor_type, location, niche, max_leads)
        webhooks = None
        if webhook_url:
            webhooks = [{
                'eventTypes': ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
                'requestUrl': webhook_url,
                'payloadTemplate': '{\n  "runId": "{{resource.id}}",\n  "eventType": "{{eventType}}"\n}',
            }]
        run = client.actor(actor_id).start(run_input=run_input, webhooks=webhooks)
        run_id = run.get('id') if isinstance(run, dict) else run.id
        logger.info(f'ApifyClient.run_actor: actor_type={actor_type} run_id={run_id}')
        return run_id

    def get_run_status(self, run_id):
        client = _get_sdk_client()
        run = client.run(run_id).get()
        return {
            'id': run.id,
            'status': run.status,
            'startedAt': run.started_at.isoformat() if run.started_at else None,
            'finishedAt': run.finished_at.isoformat() if run.finished_at else None,
            'defaultDatasetId': run.default_dataset_id,
        }

    def get_run_results(self, run_id):
        client = _get_sdk_client()
        run = client.run(run_id).get()
        if run.status not in ('SUCCEEDED', 'FINISHED'):
            logger.warning(f'get_run_results: run {run_id} not finished (status={run.status})')
            return []
        if not run.default_dataset_id:
            return []
        result = client.dataset(run.default_dataset_id).list_items()
        logger.info(f'get_run_results: {len(result.items)} items from run {run_id}')
        return result.items

    def scrape_linkedin_profiles(self, urls):
        if not urls:
            return []
        client = _get_sdk_client()
        actor_id = getattr(settings, 'APIFY_ACTOR_LINKEDIN_PROFILE', '')
        if not actor_id:
            raise ValueError('APIFY_ACTOR_LINKEDIN_PROFILE is not configured in .env')
        run_input = {
            "profileScraperMode": "Profile details no email ($4 per 1k)",
            "queries": urls,
            "urls": urls,
        }
        logger.info(f"Starting linkedin scraping for {len(urls)} profiles...")
        run = client.actor(actor_id).call(run_input=run_input)
        
        results = []
        if run and "defaultDatasetId" in run:
            for item in client.dataset(run["defaultDatasetId"]).iterate_items():
                results.append(item)
                
        return results

# Module-level singleton
apify = ApifyClient()
