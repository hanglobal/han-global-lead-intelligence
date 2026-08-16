import logging
from apps.crm.models import Lead, LeadQualificationSettings
from apps.lead_hunter.models import CampaignResult

logger = logging.getLogger(__name__)


class LeadRawSaveAgent:
    """Step 1 of pipeline: Save ALL raw Apify items as CampaignResult records.

    This runs BEFORE dedup so every scraped item has a permanent backup,
    regardless of whether it ends up as a CRM lead.
    Returns a dict mapping place_id → CampaignResult for later is_crm_synced update.
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
                    company_phone=item.get('phone', ''),
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
    Also marks the corresponding CampaignResult as is_crm_synced=True.
    """

    @staticmethod
    def run(unique_items, campaign, place_id_to_result=None):
        if not unique_items:
            return {'synced': 0, 'lead_ids': []}

        synced = 0
        lead_ids = []
        place_id_to_result = place_id_to_result or {}
        
        settings = LeadQualificationSettings.get_settings()

        for item in unique_items:
            pid = item.get('placeId', '') or ''
            
            # Apply basic qualification
            passed_qual = True
            
            title = item.get('title', '')
            phone = item.get('phone', '')
            website = item.get('website') or ''
            rating = item.get('totalScore')
            reviews = item.get('reviewsCount')
            
            if settings.require_name and not title.strip():
                passed_qual = False
            if settings.require_phone and not phone.strip():
                passed_qual = False
            if settings.require_website and not website.strip():
                passed_qual = False
            if settings.min_rating is not None and (rating is None or float(rating) < settings.min_rating):
                passed_qual = False
            if settings.min_reviews is not None and (reviews is None or int(reviews) < settings.min_reviews):
                passed_qual = False
                
            lead_status = 'qualified' if passed_qual else 'unqualified'

            try:
                lead = Lead.objects.create(
                    place_id=pid,
                    name=title,
                    status=lead_status,
                    source='gmap',
                    address=(item.get('address') or ''),
                    street_address=item.get('street', ''),
                    neighborhood=item.get('neighborhood', ''),
                    city=item.get('city', ''),
                    postal_code=item.get('postalCode', ''),
                    company_phone=item.get('phone', ''),
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
                    raw_result.is_crm_synced = True
                    raw_result.save(update_fields=['is_crm_synced'])

                # Generate activity history
                from apps.crm.models import LeadActivity
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='lead_found',
                    description='Lead was discovered on Google Maps via Apify.'
                )
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='qualification_failed',
                    description='Lead failed basic qualification and was marked unqualified.'
                )

                synced += 1
                lead_ids.append(lead.id)

            except Exception as e:
                logger.warning(
                    f"LeadImportAgent: failed to import '{item.get('title', 'unknown')}': {e}"
                )

        logger.info(f"LeadImportAgent: created {synced} leads for campaign {campaign.campaign_id}")
        return {'synced': synced, 'lead_ids': lead_ids}

    @staticmethod
    def run_single_from_ai(cr):
        """Creates a Lead record from CampaignResult using AI clean data."""
        if cr.is_crm_synced:
            return None
            
        ai_data = cr.ai_clean_data or {}
            
        pid = cr.place_id
        if not pid:
            cr.is_crm_synced = False
            cr.save(update_fields=['is_crm_synced'])
            return None
            
        # Dedup check
        if Lead.objects.filter(place_id=pid).exists():
            logger.info(f"LeadImportAgent: cr {cr.id} (place_id {pid}) is a duplicate in CRM, skipping.")
            cr.is_crm_synced = True
            cr.save(update_fields=['is_crm_synced'])
            return None
            
        ai_data = cr.ai_clean_data
        
        # Apply qualification based on final AI data
        settings = LeadQualificationSettings.get_settings()
        passed_qual = True
        
        title = ai_data.get('name') or cr.name
        phone = ai_data.get('phone', '')
            
        website = ai_data.get('website') or cr.website
        
        rating = ai_data.get('rating')
        reviews = ai_data.get('review_count')
        
        if settings.require_name and not title.strip():
            passed_qual = False
        if settings.require_phone and not (phone and phone.strip()):
            passed_qual = False
        if settings.require_website and not (website and website.strip()):
            passed_qual = False
        if settings.min_rating is not None and (rating is None or float(rating) < settings.min_rating):
            passed_qual = False
        if settings.min_reviews is not None and (reviews is None or int(reviews) < settings.min_reviews):
            passed_qual = False
            
        ai_qualification_passed = True
        qualification_reasoning = ""
        
        # Only check AI qualification if they passed basic qualification
        if passed_qual:
            is_ideal = ai_data.get('is_ideal_customer')
            qualification_reasoning = ai_data.get('qualification_reasoning', '')
            
            if is_ideal is False or str(is_ideal).lower() == 'false':
                passed_qual = False
                ai_qualification_passed = False
                
        lead_status = 'qualified' if passed_qual else 'unqualified'
        
        try:
            notes = ''
            
            lead_stage = 'completed' if lead_status == 'qualified' else 'ai_qualification'
            
            lead = Lead.objects.create(
                place_id=pid,
                name=title,
                status=lead_status,
                stage=lead_stage,
                notes=notes,
                ai_reasoning=qualification_reasoning,
                source='gmap',
                address=ai_data.get('address', ''),
                street_address=ai_data.get('street_address', ''),
                neighborhood=ai_data.get('neighborhood', ''),
                city=ai_data.get('city', ''),
                postal_code=ai_data.get('postal_code', ''),
                company_phone=phone,
                company_email=ai_data.get('company_email', ''),
                website=website[:500] if website else '',
                google_maps_url=ai_data.get('google_maps_url', ''),
                rating=rating,
                review_count=reviews,
                category=ai_data.get('category') or cr.category,
                latitude=ai_data.get('latitude') or cr.latitude,
                longitude=ai_data.get('longitude') or cr.longitude,
                facebook_url=ai_data.get('facebook_url', ''),
                twitter_url=ai_data.get('twitter_url', ''),
                instagram_url=ai_data.get('instagram_url', ''),
                linkedin_url=ai_data.get('linkedin_url', ''),
                youtube_url=ai_data.get('youtube_url', ''),
                tiktok_url=ai_data.get('tiktok_url', ''),
                pinterest_url=ai_data.get('pinterest_url', ''),
                working_hours=ai_data.get('working_hours', ''),
                scraped_at=cr.raw_data.get('scrapedAt'),
                source_campaign_id=cr.campaign.id if cr.campaign else None,
                campaign_id=cr.campaign.campaign_id if cr.campaign else None,
                campaign_ref=cr.campaign,
                crm_signals={'ai_consolidated_data': ai_data},
                raw_data=cr.raw_data or {},
                is_llm_processed=cr.is_llm_processed or False
            )
            
            cr.is_crm_synced = True
            cr.save(update_fields=['is_crm_synced'])
            
            # Generate activity history
            from apps.crm.models import LeadActivity
            LeadActivity.objects.create(
                lead=lead,
                activity_type='lead_found',
                description='Lead was discovered on Google Maps via Apify.'
            )
            LeadActivity.objects.create(
                lead=lead,
                activity_type='qualification_passed',
                description='Lead passed the basic qualification filters.'
            )
            if cr.is_website_scraped:
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='website_crawled',
                    description='Company website was successfully scraped by Firecrawl.'
                )
            LeadActivity.objects.create(
                lead=lead,
                activity_type='ai_processed',
                description='Lead data was cleaned and summarized by AI.'
            )
            
            if not ai_qualification_passed:
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='ai_qualification_failed',
                    description="Lead was rejected during AI qualification."
                )
            elif lead_status == 'qualified':
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='ai_qualification_passed',
                    description="Lead successfully passed AI qualification."
                )
            
            if cr.is_apollo_processed:
                apollo_contacts = cr.raw_data.get('apollo_contacts', [])
                if apollo_contacts:
                    names = [f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() for c in apollo_contacts]
                    LeadActivity.objects.create(
                        lead=lead,
                        activity_type='apollo_contact_enriched',
                        description=f"Successfully extracted Apollo contact information for decision makers: {', '.join(names)}"
                    )
                elif 'apollo_company' in cr.raw_data:
                    LeadActivity.objects.create(
                        lead=lead,
                        activity_type='apollo_company_enriched',
                        description='Apollo company information was enriched, but no contacts were found.'
                    )
            
            from apps.enrichment.models import LeadInsight, LeadEmailDraft
            
            if cr.is_insights_processed and ai_data.get('insights'):
                insights = ai_data.get('insights')
                LeadInsight.objects.create(
                    lead=lead,
                    pain_points=insights.get('pain_points', ''),
                    operational_gap=insights.get('operational_gap', ''),
                    opportunity=insights.get('opportunity', '')
                )
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='ai_insights_generated',
                    description='AI successfully generated strategic insights.'
                )
                
            if cr.is_insights_processed and ai_data.get('email_draft'):
                email_draft = ai_data.get('email_draft')
                LeadEmailDraft.objects.create(
                    lead=lead,
                    subject=email_draft.get('subject', 'Cold Outreach'),
                    body=email_draft.get('body', '')
                )
            
            # Start scoring the new lead async
            from agents.score_agent import LeadScoreAgent
            LeadScoreAgent.run_async()
            
            logger.info(f"LeadImportAgent: successfully created AI lead for {cr.id}")
            return lead
            
        except Exception as e:
            logger.error(f"LeadImportAgent: failed to create AI lead for cr {cr.id}: {e}")
            cr.is_crm_synced = False
            cr.save(update_fields=['is_crm_synced'])
            return None

    @staticmethod
    def run_unqualified(campaign_results):
        """Creates Lead records for unqualified CampaignResults with status='new'."""
        synced = 0
        for cr in campaign_results:
            pid = cr.place_id
            if not pid:
                continue
                
            if Lead.objects.filter(place_id=pid).exists():
                cr.is_crm_synced = True
                cr.save(update_fields=['is_crm_synced'])
                continue

            item = cr.raw_data or {}
            
            lead_stage = 'basic_qualification'
            if cr.is_duplicate:
                lead_stage = 'deduplication'
                
            try:
                ai_reasoning = cr.ai_clean_data.get('qualification_reasoning') if cr.ai_clean_data else None
                lead = Lead.objects.create(
                    place_id=pid,
                    name=cr.name or item.get('title', ''),
                    status='unqualified',
                    stage=lead_stage,
                    ai_reasoning=ai_reasoning,
                    notes='',
                    source='gmap',
                    address=cr.address or item.get('address', ''),
                    street_address=item.get('street', ''),
                    neighborhood=item.get('neighborhood', ''),
                    city=item.get('city', ''),
                    postal_code=item.get('postalCode', ''),
                    company_phone=cr.company_phone or item.get('phone', ''),
                    website=(cr.website or item.get('website', ''))[:500],
                    google_maps_url=(item.get('url') or '')[:500],
                    rating=cr.rating or item.get('totalScore'),
                    review_count=cr.review_count or item.get('reviewsCount'),
                    category=cr.category or item.get('categoryName', ''),
                    price_level=item.get('price'),
                    fid=item.get('fid', ''),
                    latitude=cr.latitude,
                    longitude=cr.longitude,
                    scraped_at=item.get('scrapedAt'),
                    source_campaign_id=cr.campaign.id if cr.campaign else None,
                    campaign_id=cr.campaign.campaign_id if cr.campaign else None,
                    campaign_ref=cr.campaign,
                    company_email=item.get('emails', [None])[0] if item.get('emails') else None,
                    facebook_url=item.get('facebooks', [None])[0] if item.get('facebooks') else None,
                    twitter_url=item.get('twitters', [None])[0] if item.get('twitters') else None,
                    instagram_url=item.get('instagrams', [None])[0] if item.get('instagrams') else None,
                    linkedin_url=item.get('linkedIns', [None])[0] if item.get('linkedIns') else None,
                    youtube_url=item.get('youtubes', [None])[0] if item.get('youtubes') else None,
                    raw_data=item,
                )
                cr.is_crm_synced = True
                cr.save(update_fields=['is_crm_synced'])
                synced += 1
            except Exception as e:
                logger.warning(f"LeadImportAgent: failed to import unqualified cr {cr.id}: {e}")
        
        logger.info(f"LeadImportAgent: imported {synced} unqualified leads.")
        
        from agents.score_agent import LeadScoreAgent
        LeadScoreAgent.run_async()
        
        return synced
