import logging
from apps.crm.models import Lead, LeadQualificationSettings
from apps.lead_hunter.models import CampaignResult

logger = logging.getLogger(__name__)


class LeadRawSaveAgent:
    """Step 1 of pipeline: Save ALL raw items as CampaignResult records.

    This runs BEFORE dedup so every scraped/ingested item has a permanent backup,
    regardless of whether it ends up as a CRM lead.
    Returns a dict mapping place_id → CampaignResult for later is_crm_synced update.
    """

    @staticmethod
    def run(items, campaign):
        place_id_to_result = {}
        saved = 0
        for item in items:
            pid = str(item.get('placeId') or item.get('id') or item.get('email') or item.get('company_domain') or '').strip()
            name = (item.get('company_name') or item.get('title') or item.get('name') or '').strip()
            address = (item.get('company_full_address') or item.get('address') or '').strip()
            phone = (item.get('company_phone') or item.get('mobile_number') or item.get('phone') or '').strip()
            website = ((item.get('company_website') or item.get('website') or '')[:500]).strip()
            category = (item.get('industry') or item.get('categoryName') or item.get('category') or '').strip()
            
            try:
                if pid:
                    result, _ = CampaignResult.objects.update_or_create(
                        campaign=campaign,
                        place_id=pid,
                        defaults={
                            'name': name,
                            'address': address,
                            'company_phone': phone,
                            'website': website,
                            'rating': item.get('totalScore') or item.get('rating'),
                            'review_count': item.get('reviewsCount') or item.get('review_count'),
                            'category': category,
                            'latitude': (
                                item.get('location', {}).get('lat')
                                if isinstance(item.get('location'), dict) else None
                            ),
                            'longitude': (
                                item.get('location', {}).get('lng')
                                if isinstance(item.get('location'), dict) else None
                            ),
                            'raw_data': item,
                            'qualification_status': 'pending',
                            'is_duplicate': False,
                            'is_basic_qualified': None,
                            'is_website_scraped': None,
                            'is_llm_processed': None,
                            'is_linkedin_processed': None,
                            'is_insights_processed': None,
                            'is_crm_synced': None,
                        }
                    )
                else:
                    result = CampaignResult.objects.create(
                        campaign=campaign,
                        place_id=pid,
                        name=name,
                        address=address,
                        company_phone=phone,
                        website=website,
                        rating=item.get('totalScore') or item.get('rating'),
                        review_count=item.get('reviewsCount') or item.get('review_count'),
                        category=category,
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
                logger.warning(f"LeadRawSaveAgent: failed to save raw result '{name or pid}': {e}")

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
            # Only enforce rating/reviews if the lead actually HAS these values.
            # Nexus B2B leads don't have Google ratings — None should not count as a failure.
            if settings.min_rating is not None and rating is not None:
                if float(rating) < settings.min_rating:
                    passed_qual = False
            if settings.min_reviews is not None and reviews is not None:
                if int(reviews) < settings.min_reviews:
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
                    description='Lead was ingested into CRM.'
                )
                if lead_status == 'qualified':
                    LeadActivity.objects.create(
                        lead=lead,
                        activity_type='qualification_passed',
                        description='Lead passed basic qualification filters.'
                    )
                else:
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
                raw_result = place_id_to_result.get(pid)
                if raw_result:
                    raw_result.is_crm_synced = False
                    raw_result.save(update_fields=['is_crm_synced'])

        logger.info(f"LeadImportAgent: created {synced} leads for campaign {campaign.campaign_id}")
        return {'synced': synced, 'lead_ids': lead_ids}

    @staticmethod
    def run_single_from_ai(cr):
        """Creates a Lead record from CampaignResult using AI clean data."""
        if cr.is_crm_synced:
            return None
            
        ai_data = cr.ai_clean_data or {}
            
        # If no place_id, cannot sync to CRM
        pid = cr.place_id
        if not pid:
            cr.is_crm_synced = False
            cr.save(update_fields=['is_crm_synced'])
            return None
            
        raw_lead = cr.raw_data or {}
        
        title = ai_data.get('name') or cr.name or raw_lead.get('company_name') or raw_lead.get('title') or ''
        phone = ai_data.get('phone') or cr.company_phone or raw_lead.get('company_phone') or raw_lead.get('mobile_number') or ''
        website = ai_data.get('website') or cr.website or raw_lead.get('company_website') or raw_lead.get('website') or ''
        rating = ai_data.get('rating') or cr.rating or raw_lead.get('totalScore')
        reviews = ai_data.get('review_count') or cr.review_count or raw_lead.get('reviewsCount')

        # Apply qualification based on final AI data
        settings = LeadQualificationSettings.get_settings()
        passed_qual = True
        ai_qualification_passed = True
        qualification_reasoning = ""
        
        # 1. If CampaignResult is already marked unqualified (from basic qualification, dedup, etc.)
        if cr.qualification_status == 'unqualified' or cr.is_basic_qualified is False or cr.is_duplicate:
            passed_qual = False
            ai_qualification_passed = False
            qualification_reasoning = ai_data.get('qualification_reasoning') or 'Lead did not meet qualification criteria or is duplicate.'
        else:
            if settings.require_name and not title.strip():
                passed_qual = False
            if settings.require_phone and not phone.strip():
                passed_qual = False
            if settings.require_website and not website.strip():
                passed_qual = False
            if settings.min_rating is not None and rating is not None:
                try:
                    if float(rating) < settings.min_rating:
                        passed_qual = False
                except (ValueError, TypeError):
                    pass
            if settings.min_reviews is not None and reviews is not None:
                try:
                    if int(reviews) < settings.min_reviews:
                        passed_qual = False
                except (ValueError, TypeError):
                    pass
            
            # Direct contact info check
            if settings.require_direct_contact:
                has_direct_contact = bool(
                    raw_lead.get('email') or raw_lead.get('personal_email') or raw_lead.get('mobile_number')
                )
                if not has_direct_contact:
                    passed_qual = False

            # LinkedIn check
            if settings.require_linkedin:
                has_linkedin = bool(
                    raw_lead.get('linkedin') or raw_lead.get('personal_linkedin') or raw_lead.get('contact_linkedin') or raw_lead.get('company_linkedin')
                )
                if not has_linkedin:
                    passed_qual = False

            # Only check AI qualification if they passed basic qualification
            if passed_qual:
                is_ideal = ai_data.get('is_ideal_customer')
                qualification_reasoning = ai_data.get('qualification_reasoning', '')
                
                if is_ideal is False or str(is_ideal).lower() == 'false':
                    passed_qual = False
                    ai_qualification_passed = False
                elif is_ideal is True or str(is_ideal).lower() == 'true':
                    ai_qualification_passed = True
                elif cr.is_llm_processed is False:
                    passed_qual = False
                    ai_qualification_passed = False
                    qualification_reasoning = qualification_reasoning or "LLM qualification processing failed."

        lead_status = 'qualified' if passed_qual else 'unqualified'
        
        try:
            notes = ''
            
            lead_stage = 'completed' if lead_status == 'qualified' else 'ai_qualification'
            
            raw_lead = cr.raw_data or {}
            source = 'nexus' if (cr.campaign and cr.campaign.actor_type == 'nexus') or raw_lead.get('company_name') else 'gmap'
            
            # Extract B2B Firmographic & Location attributes
            company_domain = raw_lead.get('company_domain') or ''
            company_size = raw_lead.get('company_size') or ''
            keywords = raw_lead.get('keywords') or ''
            company_description = raw_lead.get('company_description') or ''
            
            # Financials & Tech stack
            annual_rev = raw_lead.get('company_annual_revenue') or ''
            annual_rev_clean = raw_lead.get('company_annual_revenue_clean')
            total_funding = raw_lead.get('company_total_funding') or ''
            total_funding_clean = raw_lead.get('company_total_funding_clean')
            technologies = raw_lead.get('company_technologies') or []
            
            # Location
            city = raw_lead.get('company_city') or ai_data.get('city') or getattr(cr, 'city', '') or ''
            state = raw_lead.get('company_state') or ''
            country = raw_lead.get('company_country') or ''
            postal = raw_lead.get('company_postal_code') or ai_data.get('postal_code') or getattr(cr, 'postal_code', '') or ''
            street = raw_lead.get('company_street_address') or ai_data.get('street_address') or ''
            full_addr = raw_lead.get('company_full_address') or ai_data.get('address') or cr.address or ''

            existing_lead = Lead.objects.filter(place_id=pid).first()
            if existing_lead:
                lead = existing_lead
                lead.company_name = title or lead.company_name
                lead.status = lead_status
                lead.stage = lead_stage
                lead.notes = notes or lead.notes
                lead.ai_reasoning = qualification_reasoning or lead.ai_reasoning
                lead.source = source or lead.source
                lead.company_domain = company_domain or lead.company_domain
                lead.company_size = company_size or lead.company_size
                lead.keywords = keywords or lead.keywords
                lead.company_description = company_description or lead.company_description
                lead.company_annual_revenue = annual_rev or lead.company_annual_revenue
                lead.company_annual_revenue_clean = annual_rev_clean or lead.company_annual_revenue_clean
                lead.company_total_funding = total_funding or lead.company_total_funding
                lead.company_total_funding_clean = total_funding_clean or lead.company_total_funding_clean
                lead.company_technologies = technologies or lead.company_technologies
                lead.company_full_address = full_addr or lead.company_full_address
                lead.company_street_address = street or lead.company_street_address
                lead.city = city or lead.city
                lead.state = state or lead.state
                lead.country = country or lead.country
                lead.company_postal_code = postal or lead.company_postal_code
                lead.company_phone = phone or raw_lead.get('company_phone') or lead.company_phone
                lead.company_email = ai_data.get('company_email') or raw_lead.get('email') or lead.company_email
                lead.company_website = website[:500] if website else lead.company_website
                lead.company_linkedin = raw_lead.get('company_linkedin') or raw_lead.get('company_linkedin_url') or lead.company_linkedin
                lead.rating = rating if rating is not None else lead.rating
                lead.review_count = reviews if reviews is not None else lead.review_count
                lead.industry = ai_data.get('category') or raw_lead.get('industry') or cr.category or lead.industry
                lead.crm_signals = {
                    'ai_consolidated_data': ai_data, 
                    'company_summary': ai_data.get('company_summary'),
                    'linkedin_profile': raw_lead.get('nexus_linkedin_profile') or ai_data.get('decision_maker_linkedin') or (lead.crm_signals.get('linkedin_profile') if isinstance(lead.crm_signals, dict) else None),
                    'linkedin_posts': raw_lead.get('nexus_linkedin_posts') or ai_data.get('decision_maker_recent_posts') or (lead.crm_signals.get('linkedin_posts') if isinstance(lead.crm_signals, dict) else []) or [],
                }
                lead.raw_data = cr.raw_data or lead.raw_data
                lead.is_llm_processed = cr.is_llm_processed or lead.is_llm_processed
                lead.save()
            else:
                lead = Lead.objects.create(
                    place_id=pid,
                    company_name=title,
                    status=lead_status,
                    stage=lead_stage,
                    notes=notes,
                    ai_reasoning=qualification_reasoning,
                    source=source,
                    company_domain=company_domain,
                    company_size=company_size,
                    keywords=keywords,
                    company_description=company_description,
                    company_annual_revenue=annual_rev,
                    company_annual_revenue_clean=annual_rev_clean,
                    company_total_funding=total_funding,
                    company_total_funding_clean=total_funding_clean,
                    company_technologies=technologies,
                    company_full_address=full_addr,
                    company_street_address=street,
                    neighborhood=ai_data.get('neighborhood', ''),
                    city=city,
                    state=state,
                    country=country,
                    company_postal_code=postal,
                    company_phone=phone or raw_lead.get('company_phone') or '',
                    company_email=ai_data.get('company_email') or raw_lead.get('email') or '',
                    company_website=website[:500] if website else '',
                    company_linkedin=raw_lead.get('company_linkedin') or raw_lead.get('company_linkedin_url') or '',
                    google_maps_url=ai_data.get('google_maps_url', ''),
                    rating=rating,
                    review_count=reviews,
                    industry=ai_data.get('category') or raw_lead.get('industry') or cr.category,
                    latitude=ai_data.get('latitude') or cr.latitude,
                    longitude=ai_data.get('longitude') or cr.longitude,
                    facebook_url=ai_data.get('facebook_url') or raw_lead.get('company_facebook_url') or '',
                    twitter_url=ai_data.get('twitter_url') or raw_lead.get('company_twitter_url') or '',
                    instagram_url=ai_data.get('instagram_url') or '',
                    youtube_url=ai_data.get('youtube_url') or '',
                    tiktok_url=ai_data.get('tiktok_url') or '',
                    pinterest_url=ai_data.get('pinterest_url') or '',
                    working_hours=ai_data.get('working_hours', ''),
                    scraped_at=cr.raw_data.get('scrapedAt'),
                    source_campaign_id=cr.campaign.id if cr.campaign else None,
                    campaign_id=cr.campaign.campaign_id if cr.campaign else None,
                    campaign_ref=cr.campaign,
                    crm_signals={
                        'ai_consolidated_data': ai_data, 
                        'company_summary': ai_data.get('company_summary'),
                        'linkedin_profile': raw_lead.get('nexus_linkedin_profile') or ai_data.get('decision_maker_linkedin'),
                        'linkedin_posts': raw_lead.get('nexus_linkedin_posts') or ai_data.get('decision_maker_recent_posts') or [],
                    },
                    raw_data=cr.raw_data or {},
                    is_llm_processed=cr.is_llm_processed or False
                )
            
            cr.is_crm_synced = True
            cr.save(update_fields=['is_crm_synced'])
            
            # Sync Single Decision Maker as CompanyPerson
            from apps.crm.models import CompanyPerson, LeadActivity
            
            full_name = raw_lead.get('full_name') or f"{raw_lead.get('first_name', '')} {raw_lead.get('last_name', '')}".strip()
            if full_name:
                li_profile = raw_lead.get('nexus_linkedin_profile') or ai_data.get('decision_maker_linkedin') or {}
                headline = li_profile.get('headline') or raw_lead.get('headline') or ''
                job_title = raw_lead.get('job_title') or li_profile.get('job_title') or headline or 'Decision Maker'

                try:
                    CompanyPerson.objects.update_or_create(
                        lead=lead,
                        full_name=full_name,
                        defaults={
                            'first_name': raw_lead.get('first_name') or '',
                            'last_name': raw_lead.get('last_name') or '',
                            'job_title': job_title,
                            'headline': headline,
                            'seniority_level': raw_lead.get('seniority_level') or '',
                            'functional_level': raw_lead.get('functional_level') or '',
                            'email': raw_lead.get('email') or raw_lead.get('personal_email') or None,
                            'personal_email': raw_lead.get('personal_email') or None,
                            'mobile_number': raw_lead.get('mobile_number') or raw_lead.get('company_phone') or None,
                            'city': raw_lead.get('city') or '',
                            'state': raw_lead.get('state') or '',
                            'country': raw_lead.get('country') or '',
                            'linkedin': (
                                raw_lead.get('linkedin') or
                                raw_lead.get('personal_linkedin') or
                                raw_lead.get('contact_linkedin') or
                                raw_lead.get('company_linkedin') or
                                None
                            ),
                            'profile_image_url': li_profile.get('profile_image_url') or None,
                            'skills': li_profile.get('skills') or [],
                            'experience_history': li_profile.get('experience_history') or [],
                            'education_history': li_profile.get('education_history') or [],
                            'about': li_profile.get('about') or '',
                        }
                    )
                except Exception as cp_err:
                    logger.warning(f"Failed to create CompanyPerson for {lead.lid}: {cp_err}")

            # Generate activity history — ordered chronologically
            LeadActivity.objects.create(
                lead=lead,
                activity_type='lead_found',
                description='Lead was ingested from Nexus Data Solutions.'
            )
            if cr.is_basic_qualified:
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='qualification_passed',
                    description='Lead passed the basic qualification filters.'
                )
            else:
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='qualification_failed',
                    description=f"Lead failed basic qualification: {qualification_reasoning or 'Criteria not met'}"
                )

            if cr.is_website_scraped:
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='website_crawled',
                    description='Company website was successfully scraped by Firecrawl.'
                )

            if cr.is_linkedin_processed:
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='linkedin_enriched',
                    description='Decision-maker LinkedIn profile and posts were enriched via Nexus Data Solutions.'
                )

            if cr.is_llm_processed:
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='ai_processed',
                    description='Lead data was cleaned and summarized by AI.'
                )
                # Single definitive AI qualification result — no duplicate
                if not ai_qualification_passed:
                    LeadActivity.objects.create(
                        lead=lead,
                        activity_type='ai_qualification_failed',
                        description='Lead was rejected during AI qualification.'
                    )
                else:
                    LeadActivity.objects.create(
                        lead=lead,
                        activity_type='ai_qualification_passed',
                        description='Lead successfully passed AI qualification.'
                    )
            
            from apps.enrichment.models import LeadInsight, LeadEmailDraft, LeadEnrichment
            
            if cr.firecrawl_raw_data:
                try:
                    LeadEnrichment.objects.create(
                        lead=lead,
                        web_scrape_raw=cr.firecrawl_raw_data,
                    )
                except Exception as enrich_err:
                    logger.warning(f"Failed to create LeadEnrichment for {lead.lid}: {enrich_err}")
            
            if cr.is_insights_processed and ai_data.get('insights'):
                insights = ai_data.get('insights')
                LeadInsight.objects.update_or_create(
                    lead=lead,
                    defaults={
                        'pain_points': insights.get('pain_points', ''),
                        'operational_gap': insights.get('operational_gap', ''),
                        'opportunity': insights.get('opportunity', ''),
                    }
                )
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='ai_insights_generated',
                    description='AI successfully generated strategic insights.'
                )
                
            if cr.is_insights_processed and ai_data.get('email_draft'):
                email_draft = ai_data.get('email_draft')
                LeadEmailDraft.objects.update_or_create(
                    lead=lead,
                    subject=email_draft.get('subject', 'Cold Outreach'),
                    defaults={'body': email_draft.get('body', '')}
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
                    company_name=cr.name or item.get('company_name') or item.get('title', ''),
                    status='unqualified',
                    stage=lead_stage,
                    ai_reasoning=ai_reasoning,
                    notes='',
                    source=cr.campaign.actor_type if cr.campaign else 'nexus',
                    company_full_address=cr.address or item.get('company_full_address') or item.get('address', ''),
                    company_street_address=item.get('company_street_address') or item.get('street', ''),
                    neighborhood=item.get('neighborhood', ''),
                    city=item.get('company_city') or item.get('city', ''),
                    company_postal_code=item.get('company_postal_code') or item.get('postalCode', ''),
                    company_phone=cr.company_phone or item.get('company_phone') or item.get('phone', ''),
                    company_website=(cr.website or item.get('company_website') or item.get('website', ''))[:500],
                    company_domain=item.get('company_domain', ''),
                    google_maps_url=(item.get('url') or '')[:500],
                    rating=cr.rating or item.get('totalScore'),
                    review_count=cr.review_count or item.get('reviewsCount'),
                    industry=cr.category or item.get('industry') or item.get('categoryName', ''),
                    price_level=item.get('price'),
                    fid=item.get('fid', ''),
                    latitude=cr.latitude,
                    longitude=cr.longitude,
                    scraped_at=item.get('scrapedAt'),
                    source_campaign_id=cr.campaign.id if cr.campaign else None,
                    campaign_id=cr.campaign.campaign_id if cr.campaign else None,
                    campaign_ref=cr.campaign,
                    company_email=item.get('company_email') or item.get('email') or (item.get('emails', [None])[0] if item.get('emails') else None),
                    company_linkedin=item.get('company_linkedin') or item.get('linkedin', ''),
                    facebook_url=item.get('facebooks', [None])[0] if item.get('facebooks') else None,
                    twitter_url=item.get('twitters', [None])[0] if item.get('twitters') else None,
                    instagram_url=item.get('instagrams', [None])[0] if item.get('instagrams') else None,
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
