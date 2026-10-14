import os
import httpx
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class NexusClient:
    """
    Client for communicating with the Nexus Data Solutions RESTful API v1.
    Handles account balance, dynamic filter retrieval, campaign launch,
    status polling, and enriched B2B prospect ingestion.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        timeout: float = 30.0,
    ):
        try:
            from django.conf import settings
            conf_base_url = getattr(settings, 'NEXUS_BASE_URL', None)
            conf_client_id = getattr(settings, 'NEXUS_CLIENT_ID', None)
            conf_client_secret = getattr(settings, 'NEXUS_CLIENT_SECRET', None)
        except Exception:
            conf_base_url = None
            conf_client_id = None
            conf_client_secret = None

        self.base_url = (
            base_url
            or conf_base_url
            or os.environ.get('NEXUS_BASE_URL', 'https://app.nexusdatasolutions.online/api/v1')
        ).rstrip('/')
        self.client_id = (
            client_id
            or conf_client_id
            or os.environ.get('NEXUS_CLIENT_ID', '')
        )
        self.client_secret = (
            client_secret
            or conf_client_secret
            or os.environ.get('NEXUS_CLIENT_SECRET', '')
        )
        self.timeout = timeout

        if not self.client_id or not self.client_secret:
            logger.warning("NexusClient: NEXUS_CLIENT_ID or NEXUS_CLIENT_SECRET is missing. Nexus API requests will fail.")

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "Client-ID": self.client_id,
            "Client-Secret": self.client_secret,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def get_balance(self) -> Dict[str, Any]:
        """
        Check account prepaid balance, pricing rate, and overall delivery stats.
        GET /api/v1/balance/
        """
        url = f"{self.base_url}/balance/"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=self.headers)
                if response.status_code == 200:
                    return response.json()
                logger.error(f"Nexus get_balance failed [{response.status_code}]: {response.text}")
                return {
                    "error": f"HTTP {response.status_code}",
                    "details": response.text,
                }
        except Exception as e:
            logger.error(f"Nexus get_balance exception: {e}")
            return {"error": str(e)}

    def get_filters(self) -> Dict[str, Any]:
        """
        Retrieve available standard filter choices (industries, seniority, company size, funding, etc.).
        GET /api/v1/filters/
        """
        url = f"{self.base_url}/filters/"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=self.headers)
                if response.status_code == 200:
                    return response.json()
                logger.error(f"Nexus get_filters failed [{response.status_code}]: {response.text}")
                return {
                    "error": f"HTTP {response.status_code}",
                    "details": response.text,
                }
        except Exception as e:
            logger.error(f"Nexus get_filters exception: {e}")
            return {"error": str(e)}

    def run_campaign(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Launch lead extraction campaign on Nexus.
        POST /api/v1/campaigns/run/
        Returns campaign_id (e.g. 'cam_han_1'), uuid, status, and fetch_count.
        """
        url = f"{self.base_url}/campaigns/run/"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, headers=self.headers, json=payload)
                if response.status_code in (200, 201, 202):
                    return response.json()
                logger.error(f"Nexus run_campaign failed [{response.status_code}]: {response.text}")
                return {
                    "error": f"HTTP {response.status_code}",
                    "status_code": response.status_code,
                    "details": response.text,
                }
        except Exception as e:
            logger.error(f"Nexus run_campaign exception: {e}")
            return {"error": str(e)}

    def get_campaign_status(self, campaign_id: str) -> Dict[str, Any]:
        """
        Check status, progress, and billing for an active or completed campaign.
        GET /api/v1/campaigns/{campaign_id}/
        """
        url = f"{self.base_url}/campaigns/{campaign_id}/"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=self.headers)
                if response.status_code == 200:
                    return response.json()
                logger.error(f"Nexus get_campaign_status failed [{response.status_code}]: {response.text}")
                return {
                    "error": f"HTTP {response.status_code}",
                    "details": response.text,
                }
        except Exception as e:
            logger.error(f"Nexus get_campaign_status exception: {e}")
            return {"error": str(e)}

    def get_campaign_leads(self, campaign_id: str) -> Dict[str, Any]:
        """
        Retrieve all delivered enriched leads for a completed campaign.
        GET /api/v1/campaigns/{campaign_id}/leads/
        """
        url = f"{self.base_url}/campaigns/{campaign_id}/leads/"
        try:
            # Leads download may contain many records, give higher timeout
            with httpx.Client(timeout=60.0) as client:
                response = client.get(url, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, dict):
                        if 'posts' in data and 'leads' not in data:
                            data['leads'] = data['posts']
                        elif 'leads' in data and 'posts' not in data:
                            data['posts'] = data['leads']

                        # Deduplicate posts if present (by ID, URN, and normalized content text)
                        import re
                        for key in ('posts', 'leads'):
                            items = data.get(key)
                            if isinstance(items, list) and items:
                                seen_ids = set()
                                seen_contents = set()
                                deduped = []
                                for item in items:
                                    if isinstance(item, dict):
                                        item_id = item.get('id') or item.get('post_id') or item.get('share_urn') or item.get('linkedin_url')
                                        if item_id:
                                            if item_id in seen_ids:
                                                continue
                                            seen_ids.add(item_id)

                                        # Also deduplicate if content text is identical (e.g. cross-posted to multiple groups)
                                        raw_text = item.get('content') or item.get('text') or ''
                                        norm_text = re.sub(r'\s+', ' ', raw_text).strip().lower()
                                        if norm_text and len(norm_text) > 20:
                                            if norm_text in seen_contents:
                                                continue
                                            seen_contents.add(norm_text)
                                    deduped.append(item)
                                data[key] = deduped
                    return data
                logger.error(f"Nexus get_campaign_leads failed [{response.status_code}]: {response.text}")
                return {
                    "error": f"HTTP {response.status_code}",
                    "details": response.text,
                    "leads": [],
                    "posts": [],
                }
        except Exception as e:
            logger.error(f"Nexus get_campaign_leads exception: {e}")
            return {"error": str(e), "leads": []}

    def list_campaigns(self) -> Dict[str, Any]:
        """
        List all campaigns.
        GET /api/v1/campaigns/
        """
        url = f"{self.base_url}/campaigns/"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=self.headers)
                if response.status_code == 200:
                    return response.json()
                logger.error(f"Nexus list_campaigns failed [{response.status_code}]: {response.text}")
                return {
                    "error": f"HTTP {response.status_code}",
                    "details": response.text,
                }
        except Exception as e:
            logger.error(f"Nexus list_campaigns exception: {e}")
            return {"error": str(e)}

    def retry_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """
        Retry or re-run a campaign.
        POST /api/v1/campaigns/{campaign_id}/retry/
        """
        url = f"{self.base_url}/campaigns/{campaign_id}/retry/"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, headers=self.headers)
                if response.status_code in (200, 201, 202):
                    return response.json()
                logger.error(f"Nexus retry_campaign failed [{response.status_code}]: {response.text}")
                return {
                    "error": f"HTTP {response.status_code}",
                    "status_code": response.status_code,
                    "details": response.text,
                }
        except Exception as e:
            logger.error(f"Nexus retry_campaign exception: {e}")
            return {"error": str(e)}

    def scrape_linkedin_profiles(self, linkedin_urls: List[str], file_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Trigger Nexus LinkedIn People Profile scraping campaign.
        campaign_type: "LINKEDIN"
        """
        clean_urls = [u.strip() for u in linkedin_urls if u and isinstance(u, str) and u.strip()]
        if not clean_urls:
            return {"error": "No valid LinkedIn URLs provided"}

        payload = {
            "campaign_type": "LINKEDIN",
            "fetch_count": len(clean_urls),
            "linkedin_urls": clean_urls,
        }
        if file_name:
            payload["file_name"] = file_name
        return self.run_campaign(payload)

    def scrape_linkedin_posts(
        self, linkedin_urls: List[str], fetch_count: int = 3, file_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Trigger Nexus LinkedIn People Post scraping campaign.
        campaign_type: "LINKEDIN_POST"
        """
        clean_urls = [u.strip() for u in linkedin_urls if u and isinstance(u, str) and u.strip()]
        if not clean_urls:
            return {"error": "No valid LinkedIn URLs provided"}

        payload = {
            "campaign_type": "LINKEDIN_POST",
            "fetch_count": max(1, min(fetch_count, 10)),
            "linkedin_urls": clean_urls,
        }
        if file_name:
            payload["file_name"] = file_name
        return self.run_campaign(payload)

    def poll_campaign_results(self, campaign_id: str, max_wait: int = 45, interval: int = 5) -> Dict[str, Any]:
        """
        Polls a campaign until it finishes or reaches max_wait seconds.
        """
        import time
        start_time = time.time()
        while time.time() - start_time < max_wait:
            status_data = self.get_campaign_status(campaign_id)
            status = status_data.get('status', '').upper()
            if status == 'COMPLETED':
                leads_data = self.get_campaign_leads(campaign_id)
                return {
                    'status': 'COMPLETED',
                    'data': leads_data.get('leads', []),
                    'billed_amount': status_data.get('billed_amount', 0.0),
                }
            elif status in ('FAILED', 'ABORTED', 'CANCELLED'):
                return {
                    'status': 'FAILED',
                    'error': status_data.get('error_message') or 'Campaign failed',
                    'data': [],
                }
            time.sleep(interval)
        return {'status': 'TIMEOUT', 'error': f'Polling timed out after {max_wait}s', 'data': []}

    def enrich_linkedin_person(
        self, linkedin_url: str, fetch_posts: bool = True, posts_count: int = 3, max_wait: int = 45, use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        High-level helper to scrape a person's LinkedIn profile and optionally their latest posts.
        Returns a dict with 'profile' and 'posts' data.
        Bypasses Nexus dispatch if data already exists in DB cache.
        """
        if not linkedin_url or not isinstance(linkedin_url, str) or 'linkedin.com' not in linkedin_url.lower():
            return {'success': False, 'error': 'Invalid LinkedIn URL', 'profile': None, 'posts': []}

        if use_cache:
            try:
                from apps.enrichment.linkedin_service import get_cached_linkedin_profile
                cached = get_cached_linkedin_profile(linkedin_url)
                if cached and cached.get('status') == 'completed' and (cached.get('profile') or cached.get('posts')):
                    logger.info(f"enrich_linkedin_person: Reusing cached LinkedIn data for {linkedin_url}. Nexus charge bypassed!")
                    return {
                        'success': True,
                        'cached': True,
                        'profile': cached.get('profile'),
                        'posts': cached.get('posts', []),
                        'profile_campaign_id': cached.get('profile_cid'),
                        'post_campaign_id': cached.get('posts_cid'),
                    }
            except Exception as cache_err:
                logger.warning(f"enrich_linkedin_person cache check warning: {cache_err}")

        profile_res = self.scrape_linkedin_profiles([linkedin_url], file_name="Person Profile Enrichment")
        profile_cid = profile_res.get('campaign_id')

        posts_cid = None
        if fetch_posts:
            posts_res = self.scrape_linkedin_posts([linkedin_url], fetch_count=posts_count, file_name="Person Posts Enrichment")
            posts_cid = posts_res.get('campaign_id')

        profile_data = None
        posts_data = []

        if profile_cid:
            p_poll = self.poll_campaign_results(profile_cid, max_wait=max_wait)
            if p_poll.get('status') == 'COMPLETED' and p_poll.get('data'):
                profile_data = p_poll['data'][0]

        if posts_cid:
            post_poll = self.poll_campaign_results(posts_cid, max_wait=max_wait)
            if post_poll.get('status') == 'COMPLETED':
                posts_data = post_poll.get('data', [])

        # Save to cache if successful
        if profile_data or posts_data:
            try:
                from apps.enrichment.linkedin_service import save_linkedin_cache
                save_linkedin_cache(
                    original_url=linkedin_url,
                    profile_data=profile_data or {},
                    posts_data=posts_data or [],
                    status='completed',
                    profile_cid=profile_cid,
                    posts_cid=posts_cid,
                )
            except Exception as save_err:
                logger.warning(f"enrich_linkedin_person save cache warning: {save_err}")

        return {
            'success': bool(profile_data or posts_data),
            'profile': profile_data,
            'posts': posts_data,
            'profile_campaign_id': profile_cid,
            'post_campaign_id': posts_cid,
        }


# Global singleton instance
nexus_client = NexusClient()
