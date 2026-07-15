import logging
from apps.crm.models import Lead
from apps.lead_hunter.models import CampaignResult

logger = logging.getLogger(__name__)


class LeadRawSaveAgent:
    """Step 1 of pipeline: Save ALL raw Apify items as CampaignResult records.

    This runs BEFORE dedup so every scraped item has a permanent backup,
    regardless of whether it ends up as a CRM lead.
    Returns a dict mapping place_id → CampaignResult for later synced_to_crm update.
    """

    @staticmethod
    def run(items, campaign):
        place_id_to_result = {}
        saved = 0
        for item in items:
            pid = item.get('placeId', '') or ''
            try:
                result = CampaignResult.objects.create(
                    campaign=campaign,
                    place_id=pid,
                    name=item.get('title', ''),
                    address=(item.get('address') or ''),
                    phone=item.get('phone', ''),
                    website=(item.get('website') or '')[:500],
                    rating=item.get('totalScore'),
                    review_count=item.get('reviewsCount'),
                    category=item.get('categoryName', ''),
                    latitude=(
                        item.get('location', {}).get('lat')
                        if isinstance(item.get('location'), dict) else None
                    ),
                    longitude=(
                        item.get('location', {}).get('lng')
                        if isinstance(item.get('location'), dict) else None
                    ),
                    raw_data=item,
                )
                if pid:
                    place_id_to_result[pid] = result
                saved += 1
            except Exception as e:
                logger.warning(f"LeadRawSaveAgent: failed to save raw result '{item.get('title')}': {e}")

        logger.info(f"LeadRawSaveAgent: saved {saved} raw results for campaign {campaign.campaign_id}")
        return place_id_to_result


class LeadImportAgent:
    """Step 3 of pipeline: Create Lead records for unique (deduped) items only.

    Receives items already filtered by DedupAgent.
    Also marks the corresponding CampaignResult as synced_to_crm=True.
    """

    @staticmethod
    def run(unique_items, campaign, place_id_to_result=None):
        if not unique_items:
            return {'synced': 0, 'lead_ids': []}

        synced = 0
        lead_ids = []
        place_id_to_result = place_id_to_result or {}

        for item in unique_items:
            pid = item.get('placeId', '') or ''
            try:
                lead = Lead.objects.create(
                    place_id=pid,
                    name=item.get('title', ''),
                    source='gmap',
                    address=(item.get('address') or ''),
                    street_address=item.get('street', ''),
                    neighborhood=item.get('neighborhood', ''),
                    city=item.get('city', ''),
                    postal_code=item.get('postalCode', ''),
                    phone=item.get('phone', ''),
                    website=(item.get('website') or '')[:500],
                    google_maps_url=(item.get('url') or '')[:500],
                    rating=item.get('totalScore'),
                    review_count=item.get('reviewsCount'),
                    category=item.get('categoryName', ''),
                    price_level=item.get('price'),
                    fid=item.get('fid', ''),
                    latitude=(
                        item.get('location', {}).get('lat')
                        if isinstance(item.get('location'), dict) else None
                    ),
                    longitude=(
                        item.get('location', {}).get('lng')
                        if isinstance(item.get('location'), dict) else None
                    ),
                    scraped_at=item.get('scrapedAt'),
                    source_campaign_id=campaign.id,
                    campaign_id=campaign.campaign_id,
                    campaign_ref=campaign,
                    company_email=item.get('emails', [None])[0] if item.get('emails') else None,
                    social_links={
                        "facebook": item.get('facebooks', []),
                        "instagram": item.get('instagrams', []),
                        "linkedin": item.get('linkedIns', []),
                        "twitter": item.get('twitters', []),
                        "youtube": item.get('youtubes', []),
                        "tiktok": item.get('tiktoks', []),
                    },
                    facebook_url=item.get('facebooks', [None])[0] if item.get('facebooks') else None,
                    twitter_url=item.get('twitters', [None])[0] if item.get('twitters') else None,
                    instagram_url=item.get('instagrams', [None])[0] if item.get('instagrams') else None,
                    linkedin_url=item.get('linkedIns', [None])[0] if item.get('linkedIns') else None,
                    youtube_url=item.get('youtubes', [None])[0] if item.get('youtubes') else None,
                    raw_data=item,
                )

                # Mark the CampaignResult as synced
                raw_result = place_id_to_result.get(pid)
                if raw_result:
                    raw_result.synced_to_crm = True
                    raw_result.save(update_fields=['synced_to_crm'])

                synced += 1
                lead_ids.append(lead.id)

            except Exception as e:
                logger.warning(
                    f"LeadImportAgent: failed to import '{item.get('title', 'unknown')}': {e}"
                )

        logger.info(f"LeadImportAgent: created {synced} leads for campaign {campaign.campaign_id}")
        return {'synced': synced, 'lead_ids': lead_ids}
