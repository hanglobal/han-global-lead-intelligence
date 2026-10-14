import re
import logging
from typing import Optional, Dict, Any
from django.db.models import F

logger = logging.getLogger(__name__)


def normalize_linkedin_url(url: Optional[str]) -> Optional[str]:
    """
    Standardize LinkedIn URLs into a clean, canonical lookup key.
    Examples:
      - 'https://www.linkedin.com/in/john-doe/' -> 'linkedin.com/in/john-doe'
      - 'http://linkedin.com/in/john-doe?utm_source=xyz' -> 'linkedin.com/in/john-doe'
      - 'https://www.linkedin.com/in/john-doe/overlay/contact-info/' -> 'linkedin.com/in/john-doe'
      - 'https://linkedin.com/company/apple/' -> 'linkedin.com/company/apple'
    """
    if not url or not isinstance(url, str):
        return None

    cleaned = url.strip()
    if 'linkedin.com' not in cleaned.lower():
        return None

    # Remove protocol (http://, https://) and www.
    cleaned = re.sub(r'^https?://', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'^www\.', '', cleaned, flags=re.IGNORECASE)

    # Strip query parameters (?...) and anchors (#...)
    cleaned = cleaned.split('?')[0].split('#')[0]

    # Strip trailing and leading slashes
    cleaned = cleaned.strip('/')

    # Strip auxiliary sub-paths often appended to profile URLs
    cleaned = re.sub(r'/(overlay|detail|recent-activity|posts)/.*$', '', cleaned, flags=re.IGNORECASE)

    return cleaned.lower()


def get_cached_linkedin_profile(linkedin_url: str) -> Optional[Dict[str, Any]]:
    """
    Check if a LinkedIn URL has already been scraped by Nexus.
    Searches 3 layers:
      1. Dedicated `LinkedInProfileCache` table (O(1) indexed lookup)
      2. Previous `CampaignResult` records with scraped Nexus data
      3. Existing CRM `Lead` and `CompanyPerson` records with enriched signals

    Returns dict with 'profile' and 'posts' data if found, or None if not cached.
    """
    norm_url = normalize_linkedin_url(linkedin_url)
    if not norm_url:
        return None

    from apps.enrichment.models import LinkedInProfileCache

    # ── Layer 1: Check dedicated LinkedInProfileCache table ──────────────────
    entry = LinkedInProfileCache.objects.filter(normalized_url=norm_url).first()
    if entry:
        if entry.status == 'completed' and (entry.profile_data or entry.posts_data):
            # Increment hit counter atomically
            LinkedInProfileCache.objects.filter(id=entry.id).update(hit_count=F('hit_count') + 1)
            entry.refresh_from_db(fields=['hit_count'])
            logger.info(
                f"[LinkedIn Cache HIT] Found completed cache for {norm_url} "
                f"(reused {entry.hit_count}x). Nexus charge bypassed!"
            )
            return {
                'status': 'completed',
                'profile': entry.profile_data or {},
                'posts': entry.posts_data or [],
                'profile_cid': entry.profile_campaign_id,
                'posts_cid': entry.post_campaign_id,
                'source': 'cache_table',
                'hit_count': entry.hit_count,
            }
        elif entry.status == 'in_progress':
            logger.info(f"[LinkedIn Cache IN_PROGRESS] In-flight Nexus campaign already exists for {norm_url}")
            return {
                'status': 'in_progress',
                'profile': {},
                'posts': [],
                'profile_cid': entry.profile_campaign_id,
                'posts_cid': entry.post_campaign_id,
                'source': 'cache_table_in_progress',
            }

    # ── Layer 2: Search existing CampaignResult records ──────────────────────
    from apps.lead_hunter.models import CampaignResult

    # Check for any CampaignResult that has nexus_linkedin_profile or nexus_linkedin_posts
    candidate_crs = CampaignResult.objects.filter(
        is_linkedin_processed=True
    ).exclude(raw_data__nexus_linkedin_profile__isnull=True).order_by('-id')[:200]

    for cr in candidate_crs:
        raw = cr.raw_data or {}
        cr_li_url = (
            raw.get('linkedin') or
            raw.get('personal_linkedin') or
            raw.get('contact_linkedin') or
            raw.get('company_linkedin') or
            ''
        )
        if normalize_linkedin_url(cr_li_url) == norm_url:
            profile = raw.get('nexus_linkedin_profile') or {}
            posts = raw.get('nexus_linkedin_posts') or []
            if profile or posts:
                logger.info(f"[LinkedIn Cache HIT] Recovered existing scrape from CampaignResult #{cr.id} for {norm_url}")
                # Backfill into LinkedInProfileCache for instant future O(1) lookups
                cached_entry, _ = LinkedInProfileCache.objects.update_or_create(
                    normalized_url=norm_url,
                    defaults={
                        'original_url': linkedin_url,
                        'person_name': cr.name or '',
                        'profile_data': profile,
                        'posts_data': posts,
                        'status': 'completed',
                        'profile_campaign_id': raw.get('nexus_linkedin_profile_cid'),
                        'post_campaign_id': raw.get('nexus_linkedin_post_cid'),
                        'hit_count': 2,
                    }
                )
                return {
                    'status': 'completed',
                    'profile': profile,
                    'posts': posts,
                    'source': 'campaign_results',
                    'hit_count': cached_entry.hit_count,
                }

    # ── Layer 3: Search existing CRM Lead & CompanyPerson records ────────────
    from apps.crm.models import Lead, CompanyPerson

    # Extract username slug (e.g. 'doug-arthur-b449b09' from 'linkedin.com/in/doug-arthur-b449b09')
    slug_parts = norm_url.split('/')
    slug = slug_parts[-1] if slug_parts else norm_url

    if slug and len(slug) >= 3:
        matched_people = CompanyPerson.objects.filter(linkedin__icontains=slug).select_related('lead')
        for person in matched_people:
            if person.lead and isinstance(person.lead.crm_signals, dict):
                p_li = person.lead.crm_signals.get('linkedin_profile')
                p_posts = person.lead.crm_signals.get('linkedin_posts') or []
                if p_li or p_posts:
                    logger.info(f"[LinkedIn Cache HIT] Recovered existing scrape from CRM Lead {person.lead.lid} for {norm_url}")
                    cached_entry, _ = LinkedInProfileCache.objects.update_or_create(
                        normalized_url=norm_url,
                        defaults={
                            'original_url': linkedin_url,
                            'person_name': person.full_name or '',
                            'profile_data': p_li or {},
                            'posts_data': p_posts or [],
                            'status': 'completed',
                            'hit_count': 2,
                        }
                    )
                    return {
                        'status': 'completed',
                        'profile': p_li or {},
                        'posts': p_posts or [],
                        'source': 'crm_leads',
                        'hit_count': cached_entry.hit_count,
                    }

    return None


def save_linkedin_cache(
    original_url: str,
    profile_data: Optional[Dict[str, Any]] = None,
    posts_data: Optional[list] = None,
    status: str = 'completed',
    profile_cid: Optional[str] = None,
    posts_cid: Optional[str] = None,
    person_name: str = '',
) -> Optional[Any]:
    """
    Save or update a LinkedIn scraping result in the cache table.
    """
    norm_url = normalize_linkedin_url(original_url)
    if not norm_url:
        return None

    from apps.enrichment.models import LinkedInProfileCache

    defaults = {
        'original_url': original_url,
        'status': status,
    }
    if profile_data is not None:
        defaults['profile_data'] = profile_data
    if posts_data is not None:
        defaults['posts_data'] = posts_data
    if profile_cid:
        defaults['profile_campaign_id'] = profile_cid
    if posts_cid:
        defaults['post_campaign_id'] = posts_cid
    if person_name:
        defaults['person_name'] = person_name

    entry, created = LinkedInProfileCache.objects.update_or_create(
        normalized_url=norm_url,
        defaults=defaults
    )
    action = "Created new" if created else "Updated"
    logger.info(f"[LinkedIn Cache] {action} cache entry for {norm_url} (status: {status})")
    return entry
