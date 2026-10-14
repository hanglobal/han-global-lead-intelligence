from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Count, Q, F
from django.utils import timezone
import uuid
from datetime import datetime, timedelta
from .models import Lead, LeadActivity, CompanyPerson, LeadQualificationSettings, LeadNote
from agents.score_agent import LeadScoreAgent


def _serialize_person(p):
    return {
        'id': p.id,
        'lead_id': p.lead_id,
        'full_name': p.full_name,
        'first_name': p.first_name,
        'last_name': p.last_name,
        'job_title': p.job_title,
        'headline': p.headline,
        'seniority_level': p.seniority_level,
        'functional_level': p.functional_level,
        'email': p.email,
        'personal_email': p.personal_email,
        'mobile_number': p.mobile_number,
        'linkedin': p.linkedin,
        'city': p.city,
        'state': p.state,
        'country': p.country,
        'about': p.about,
        'skills': p.skills,
        'experience_history': p.experience_history,
        'education_history': p.education_history,
        'profile_image_url': p.profile_image_url,
        'created_at': p.created_at.isoformat() if p.created_at else None,
        'updated_at': p.updated_at.isoformat() if p.updated_at else None,
    }


def _serialize_lead(l, detail=False):
    """Single source of truth for Lead serialization with lightweight summary mode for lists."""
    
    # Safely get the latest enrichment only when detailed view is requested
    firecrawl_raw_data = None
    if detail:
        enrichment = l.enrichments.order_by('-created_at').first()
        if enrichment:
            firecrawl_raw_data = enrichment.web_scrape_raw
        
    insight_data = None
    if hasattr(l, 'insight') and l.insight:
        insight_data = {
            'pain_points': l.insight.pain_points,
            'operational_gap': l.insight.operational_gap,
            'opportunity': l.insight.opportunity,
        }
        
    email_drafts_data = []
    for draft in l.email_drafts.all():
        email_drafts_data.append({
            'subject': draft.subject,
            'body': draft.body,
        })
    if not email_drafts_data and isinstance(l.crm_signals, dict):
        ai_cons = l.crm_signals.get('ai_consolidated_data')
        if isinstance(ai_cons, dict):
            ed = ai_cons.get('email_draft')
            if isinstance(ed, dict) and (ed.get('subject') or ed.get('body')):
                email_drafts_data.append({
                    'subject': ed.get('subject', ''),
                    'body': ed.get('body', ''),
                })

    # Company people (decision makers)
    company_people_data = [_serialize_person(p) for p in l.company_people.all()]

    decision_maker = company_people_data[0] if company_people_data else None

    # Resolve AI Qualification Reasoning from direct field or nested signals
    ai_reasoning = l.ai_reasoning or ''
    if not ai_reasoning.strip() and isinstance(l.crm_signals, dict):
        ai_cons = l.crm_signals.get('ai_consolidated_data')
        if isinstance(ai_cons, dict):
            ai_reasoning = ai_cons.get('qualification_reasoning') or ai_cons.get('reasoning') or ''
        if not ai_reasoning.strip():
            ai_reasoning = l.crm_signals.get('qualification_reasoning') or l.crm_signals.get('qualification_reason') or l.crm_signals.get('reasoning') or ''
    if not ai_reasoning.strip() and isinstance(l.raw_data, dict):
        ai_eval = l.raw_data.get('ai_evaluation')
        if isinstance(ai_eval, dict):
            ai_reasoning = ai_eval.get('reasoning') or ai_eval.get('qualification_reasoning') or ''
        if not ai_reasoning.strip():
            ai_reasoning = l.raw_data.get('qualification_reasoning') or l.raw_data.get('reasoning') or ''

    # ── Synthesize "Why Now" / Sales Brief from Nexus & Signals ─────────
    firmo_parts = []
    if l.company_size:
        firmo_parts.append(f"{l.company_size} staff")
    if l.company_annual_revenue_clean:
        firmo_parts.append(f"est. {l.company_annual_revenue_clean} rev")
    elif l.company_annual_revenue:
        firmo_parts.append(f"est. {l.company_annual_revenue} rev")
    firmo_str = f" ({', '.join(firmo_parts)})" if firmo_parts else ""

    industry_str = l.industry or 'target niche'

    hook_str = ""
    if insight_data and insight_data.get('pain_points'):
        first_pain = insight_data['pain_points'].split('\n')[0].replace('•', '').replace('-', '').strip()
        if first_pain:
            hook_str = f" Key opportunity: {first_pain}."
    elif ai_reasoning:
        hook_str = f" Signal: {ai_reasoning.split('.')[0].strip()}."
    elif l.rating and l.review_count:
        hook_str = f" Strong presence with {l.rating}★ across {l.review_count} reviews; primed for automated outreach."
    else:
        hook_str = f" Qualified {industry_str} prospect ready for direct outreach."

    sales_brief = f"{l.company_name or 'Company'} operates in {industry_str}{firmo_str}.{hook_str}"

    # Recommended service mapping
    recommended_service = "Growth & Outbound Engine"
    ind_lower = (l.industry or '').lower()
    if any(k in ind_lower for k in ['dent', 'clinic', 'health', 'medic', 'doctor']):
        recommended_service = "Patient Acquisition & Local SEO"
    elif any(k in ind_lower for k in ['legal', 'law', 'attorney']):
        recommended_service = "High-Ticket Client Acquisition"
    elif any(k in ind_lower for k in ['tech', 'software', 'saas', 'it']):
        recommended_service = "B2B Lead Intelligence & Cold Outbound"
    elif any(k in ind_lower for k in ['real estate', 'property', 'construct', 'roof', 'hvac']):
        recommended_service = "Local High-Intent Inbound & Reputation"

    dm_email = (decision_maker.get('personal_email') or decision_maker.get('email')) if decision_maker else None
    effective_email = dm_email or l.company_email or ''
    has_verified_email = bool(effective_email and '@' in effective_email)
    has_decision_maker = bool(decision_maker and decision_maker.get('full_name'))
    is_send_ready = has_decision_maker and has_verified_email

    today_date = timezone.localdate()
    is_overdue = bool(l.follow_up_date and l.follow_up_date < today_date and l.follow_up_status == 'scheduled')
    is_due_today = bool(l.follow_up_date and l.follow_up_date == today_date and l.follow_up_status == 'scheduled')

    res = {
        'id': l.id,
        'lid': l.lid,
        'place_id': l.place_id,
        'source': l.source,
        # ── Company Info (Exact Nexus Fields) ────────────────────────────────
        'company_name': l.company_name,
        'name': l.company_name,
        'company_website': l.company_website,
        'website': l.company_website,
        'company_domain': l.company_domain,
        'company_phone': l.company_phone,
        'phone': l.company_phone,
        'company_linkedin': l.company_linkedin,
        'industry': l.industry,
        'category': l.industry,
        'company_size': l.company_size,
        'company_annual_revenue': l.company_annual_revenue,
        'company_annual_revenue_clean': l.company_annual_revenue_clean,
        'company_total_funding': l.company_total_funding,
        'company_total_funding_clean': l.company_total_funding_clean,
        'company_technologies': l.company_technologies or [],
        'keywords': l.keywords,
        'company_description': l.company_description,
        'city': l.city,
        'state': l.state,
        'country': l.country,
        # ── Address / Contact ────────────────────────────────────────────────
        'company_full_address': l.company_full_address,
        'address': l.company_full_address,
        'company_street_address': l.company_street_address,
        'neighborhood': l.neighborhood,
        'company_postal_code': l.company_postal_code,
        'company_email': l.company_email,
        'email': l.company_email,
        'google_maps_url': l.google_maps_url,
        'rating': l.rating,
        'review_count': l.review_count,
        'price_level': l.price_level,
        'fid': l.fid,
        'latitude': l.latitude,
        'longitude': l.longitude,
        # ── CRM Pipeline ─────────────────────────────────────────────────────
        'status': l.status,
        'stage': getattr(l, 'stage', None),
        'notes': l.notes,
        'tags': l.tags,
        'score': l.score,
        'score_label': l.score_label,
        'score_reasons': getattr(l, 'score_reasons', None) or (l.crm_signals or {}).get('score_reasons') or (l.raw_data or {}).get('score_reasons') or [],
        'company_summary': (
            (l.crm_signals or {}).get('company_summary') or
            ((l.crm_signals or {}).get('ai_consolidated_data') or {}).get('company_summary') or
            ''
        ),
        'working_hours': getattr(l, 'working_hours', None),
        'classification': l.classification,
        'campaign_id': l.campaign_id,
        'source_campaign_id': l.source_campaign_id,
        'facebook_url': l.facebook_url,
        'twitter_url': l.twitter_url,
        'instagram_url': l.instagram_url,
        'youtube_url': l.youtube_url,
        'tiktok_url': l.tiktok_url,
        'pinterest_url': l.pinterest_url,
        'social_links': l.social_links,
        'ai_reasoning': ai_reasoning,
        'scraped_at': l.scraped_at,
        'insight': insight_data,
        'decision_maker': decision_maker,
        'company_people': company_people_data,
        'linkedin_profile': (
            (l.crm_signals or {}).get('linkedin_profile') or
            ((l.crm_signals or {}).get('ai_consolidated_data') or {}).get('decision_maker_linkedin') or
            (l.raw_data or {}).get('nexus_linkedin_profile') or
            (l.raw_data or {}).get('linkedin_profile') or
            None
        ),
        'linkedin_posts': (
            (l.crm_signals or {}).get('linkedin_posts') or
            ((l.crm_signals or {}).get('ai_consolidated_data') or {}).get('decision_maker_recent_posts') or
            (l.raw_data or {}).get('nexus_linkedin_posts') or
            (l.raw_data or {}).get('linkedin_posts') or
            []
        ),
        # ── Sales & Follow-up Workflow ──────────────────────────────────────────
        'sales_brief': sales_brief,
        'why_now': sales_brief,
        'recommended_service': recommended_service,
        'effective_email': effective_email,
        'has_verified_email': has_verified_email,
        'has_decision_maker': has_decision_maker,
        'is_send_ready': is_send_ready,
        'is_overdue': is_overdue,
        'is_due_today': is_due_today,
        'follow_up_date': l.follow_up_date.isoformat() if l.follow_up_date else None,
        'follow_up_time': l.follow_up_time,
        'follow_up_status': l.follow_up_status or 'none',
        'follow_up_priority': l.follow_up_priority or 'medium',
        'follow_up_action_type': l.follow_up_action_type or 'call',
        'follow_up_notes': l.follow_up_notes or '',
        'last_contacted_at': l.last_contacted_at.isoformat() if l.last_contacted_at else None,
        'created_at': l.created_at.isoformat() if l.created_at else None,
        'updated_at': l.updated_at.isoformat() if l.updated_at else None,
        'email_drafts': email_drafts_data,
    }

    if detail:
        res['crm_signals'] = l.crm_signals
        res['raw_data'] = l.raw_data
        res['firecrawl_raw_data'] = firecrawl_raw_data
        res['notes_history'] = [
            {
                'id': n.id,
                'note': n.note,
                'created_by': n.created_by,
                'created_at': n.created_at.isoformat() if n.created_at else None,
            }
            for n in l.lead_notes.all()
        ] if hasattr(l, 'lead_notes') else []
    else:
        res['crm_signals'] = None
        res['raw_data'] = None
        res['firecrawl_raw_data'] = None
        res['notes_history'] = []

    return res


class LeadListCreateView(APIView):
    def get(self, request):
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')

        leads = Lead.objects.all().select_related('insight').prefetch_related('enrichments', 'email_drafts', 'company_people').order_by('-created_at')

        if status_filter:
            leads = leads.filter(status=status_filter)

        if search:
            search = search.strip()
            leads = leads.filter(
                Q(company_name__icontains=search) |
                Q(company_full_address__icontains=search) |
                Q(company_domain__icontains=search) |
                Q(company_phone__icontains=search) |
                Q(company_email__icontains=search) |
                Q(industry__icontains=search) |
                Q(city__icontains=search)
            )

        campaign_ids = request.query_params.get('campaign_id')
        if campaign_ids:
            ids_list = [cid.strip() for cid in campaign_ids.split(',') if cid.strip()]
            if ids_list:
                leads = leads.filter(campaign_id__in=ids_list)

        # ── Pagination ────────────────────────────────────────────────────────
        # If 'page' is specified, return paginated object envelope.
        # Otherwise return plain list for backwards compatibility.
        if 'page' in request.query_params:
            try:
                page = max(1, int(request.query_params.get('page', 1)))
            except (ValueError, TypeError):
                page = 1
            try:
                page_size = min(500, max(1, int(request.query_params.get('page_size', 75))))
            except (ValueError, TypeError):
                page_size = 75

            total_count = leads.count()
            start = (page - 1) * page_size
            end = start + page_size
            page_leads = leads[start:end]

            # Build next/previous URLs
            base_url = request.build_absolute_uri(request.path)
            query_params = request.query_params.copy()

            def page_url(p):
                query_params['page'] = p
                query_params['page_size'] = page_size
                return f"{base_url}?{'&'.join(f'{k}={v}' for k, v in query_params.items())}"

            has_next = end < total_count
            has_prev = page > 1

            data = [_serialize_lead(l, detail=False) for l in page_leads]
            return Response({
                'results': data,
                'count': total_count,
                'page': page,
                'page_size': page_size,
                'next': page_url(page + 1) if has_next else None,
                'previous': page_url(page - 1) if has_prev else None,
            })

        # Safety limit on unpaginated requests to prevent OOM
        data = [_serialize_lead(l, detail=False) for l in leads[:500]]
        return Response(data)


    def post(self, request):
        place_id = request.data.get('place_id', '').strip()
        if place_id and Lead.objects.filter(place_id=place_id).exists():
            return Response(
                {'error': 'Lead with this place_id already exists', 'place_id': place_id},
                status=status.HTTP_409_CONFLICT,
            )
        if not place_id:
            place_id = f"manual_{uuid.uuid4().hex[:16]}"

        lead = Lead.objects.create(
            place_id=place_id,
            company_name=request.data.get('company_name') or request.data.get('name') or 'Unnamed Lead',
            company_full_address=request.data.get('company_full_address') or request.data.get('address') or '',
            company_street_address=request.data.get('company_street_address') or request.data.get('street_address') or '',
            neighborhood=request.data.get('neighborhood') or '',
            city=request.data.get('city') or '',
            company_postal_code=request.data.get('company_postal_code') or request.data.get('postal_code') or '',
            company_phone=request.data.get('company_phone') or request.data.get('phone') or '',
            source=request.data.get('source') or 'manual',
            company_website=request.data.get('company_website') or request.data.get('website') or '',
            company_domain=request.data.get('company_domain') or '',
            company_linkedin=request.data.get('company_linkedin') or request.data.get('linkedin_url') or '',
            google_maps_url=request.data.get('google_maps_url') or '',
            company_email=request.data.get('company_email') or '',
            rating=request.data.get('rating'),
            review_count=request.data.get('review_count') or request.data.get('reviews') or 0,
            price_level=request.data.get('price_level') or '',
            industry=request.data.get('industry') or request.data.get('category') or '',
            fid=request.data.get('fid') or '',
            latitude=request.data.get('latitude'),
            longitude=request.data.get('longitude'),
            scraped_at=request.data.get('scraped_at'),
        )
        return Response(
            {
                'id': lead.id,
                'lid': lead.lid,
                'name': lead.name,
                'company_name': lead.company_name,
                'status': lead.status,
            },
            status=status.HTTP_201_CREATED,
        )


class LeadDetailView(APIView):
    def get(self, request, pk):
        lead = get_object_or_404(
            Lead.objects.select_related('insight').prefetch_related(
                'enrichments', 'email_drafts', 'company_people', 'lead_notes', 'activities'
            ), 
            pk=pk
        )
        data = _serialize_lead(lead, detail=True)
        return Response(data)

    def delete(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        lead.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class LeadStatusUpdateView(APIView):
    def patch(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'status is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        valid_statuses = [choice[0] for choice in Lead.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f"Invalid status '{new_status}'. Valid choices are: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        lead.status = new_status
        lead.save(update_fields=['status'])
        LeadActivity.objects.create(
            lead=lead,
            activity_type='status_change',
            description=f"Status changed to {lead.status}",
        )
        return Response({'id': lead.id, 'status': lead.status})


class LeadNotesUpdateView(APIView):
    def patch(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        lead.notes = request.data.get('notes', lead.notes)
        lead.save()
        return Response({'id': lead.id, 'notes': lead.notes})


class LeadActivityListView(APIView):
    def get(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        activities = lead.activities.all()
        data = [
            {
                'id': a.id,
                'activity_type': a.activity_type,
                'description': a.description,
                'created_at': a.created_at,
            }
            for a in activities
        ]
        return Response(data)


class CRMStatsView(APIView):
    def get(self, request):
        total = Lead.objects.count()
        # Single aggregated query instead of 8 separate ones
        rows = (
            Lead.objects.values('status')
            .annotate(count=Count('status'))
        )
        by_status = {row['status']: row['count'] for row in rows}
        for s in ['new', 'qualified', 'unqualified']:
            by_status.setdefault(s, 0)
        return Response({'total': total, 'by_status': by_status})


class BulkScoreLeadsView(APIView):
    """Bulk score leads - processes 100 at a time via the Score Agent."""

    def post(self, request):
        result = LeadScoreAgent.run()

        if result['scored'] == 0:
            return Response({
                'message': 'All leads already scored',
                'scored_count': 0,
                'remaining': result['remaining'],
            })

        return Response({
            'message': f"Scored {result['scored']} leads",
            'scored_count': result['scored'],
            'remaining': result['remaining'],
        })


class CompanyPersonListCreateView(APIView):
    def get(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        people = [p for p in lead.company_people.all()]
        return Response({
            'lead_id': lead.id,
            'people': [_serialize_person(p) for p in people],
        })

    def post(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        data = request.data or {}
        name = (data.get('full_name') or data.get('companyperson_name') or '').strip()
        if not name:
            return Response(
                {'error': 'full_name is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            with transaction.atomic():
                person = CompanyPerson.objects.create(
                    lead=lead,
                    full_name=name,
                    first_name=data.get('first_name') or '',
                    last_name=data.get('last_name') or '',
                    job_title=(data.get('job_title') or data.get('role') or '').strip(),
                    headline=data.get('headline') or '',
                    seniority_level=data.get('seniority_level') or '',
                    functional_level=data.get('functional_level') or '',
                    email=data.get('email') or None,
                    personal_email=data.get('personal_email') or None,
                    mobile_number=data.get('mobile_number') or data.get('phone') or None,
                    linkedin=data.get('linkedin') or data.get('linkedin_url') or None,
                )
        except Exception as e:
            msg = str(e)
            if 'uniq_person_per_lead_role' in msg:
                return Response(
                    {'error': 'A person with this name and role already exists for this lead.'},
                    status=status.HTTP_409_CONFLICT,
                )
            return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_serialize_person(person), status=status.HTTP_201_CREATED)


class CompanyPersonDetailView(APIView):
    def _get(self, lead_id, person_id):
        return get_object_or_404(CompanyPerson, pk=person_id, lead_id=lead_id)

    def patch(self, request, pk, person_id):
        person = self._get(pk, person_id)
        data = request.data or {}
        editable = [
            'full_name', 'first_name', 'last_name', 'job_title', 
            'headline', 'seniority_level', 'functional_level', 'email', 'personal_email', 
            'mobile_number', 'linkedin'
        ]
        try:
            with transaction.atomic():
                for field in editable:
                    if field in data:
                        value = data[field]
                        if field == 'full_name' and value is not None:
                            value = str(value).strip()
                            if not value:
                                return Response(
                                    {'error': 'full_name cannot be empty'},
                                    status=status.HTTP_400_BAD_REQUEST,
                                )
                        if field in ('email', 'personal_email', 'mobile_number', 'linkedin', 'job_title', 'headline', 'seniority_level', 'functional_level') and isinstance(value, str):
                            value = value.strip() or None
                        setattr(person, field, value)
                person.save()
        except Exception as e:
            msg = str(e)
            if 'uniq_person_per_lead_role' in msg:
                return Response(
                    {'error': 'A person with this name and role already exists for this lead.'},
                    status=status.HTTP_409_CONFLICT,
                )
            return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_serialize_person(person))

    def delete(self, request, pk, person_id):
        person = self._get(pk, person_id)
        person.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)





class LeadQualificationSettingsView(APIView):
    def get(self, request):
        settings = LeadQualificationSettings.get_settings()
        return Response({
            'require_website': settings.require_website,
            'require_name': settings.require_name,
            'require_direct_contact': settings.require_direct_contact,
            'require_linkedin': settings.require_linkedin,
            'min_reviews': settings.min_reviews,
            'min_rating': settings.min_rating,
            'require_phone': settings.require_phone,
            'agency_services': settings.agency_services,
            'scoring_rules': settings.scoring_rules,
            'insight_generation_rules': settings.insight_generation_rules,
            'email_generation_rules': settings.email_generation_rules,
        })

    def patch(self, request):
        settings = LeadQualificationSettings.get_settings()
        data = request.data
        if 'require_website' in data:
            settings.require_website = bool(data['require_website'])
        if 'require_name' in data:
            settings.require_name = bool(data['require_name'])
        if 'require_direct_contact' in data:
            settings.require_direct_contact = bool(data['require_direct_contact'])
        if 'require_linkedin' in data:
            settings.require_linkedin = bool(data['require_linkedin'])
        if 'require_phone' in data:
            settings.require_phone = bool(data['require_phone'])
        if 'min_reviews' in data:
            try:
                settings.min_reviews = max(0, int(data['min_reviews']))
            except (ValueError, TypeError):
                return Response({'error': 'min_reviews must be a valid integer'}, status=status.HTTP_400_BAD_REQUEST)
        if 'min_rating' in data:
            try:
                settings.min_rating = max(0.0, min(5.0, float(data['min_rating'])))
            except (ValueError, TypeError):
                return Response({'error': 'min_rating must be a valid float between 0.0 and 5.0'}, status=status.HTTP_400_BAD_REQUEST)
        if 'agency_services' in data:
            settings.agency_services = str(data['agency_services'])
        if 'scoring_rules' in data:
            settings.scoring_rules = str(data['scoring_rules'])
        if 'insight_generation_rules' in data:
            settings.insight_generation_rules = str(data['insight_generation_rules'])
        if 'email_generation_rules' in data:
            settings.email_generation_rules = str(data['email_generation_rules'])
        settings.save()
        return Response({
            'status': 'success',
            'require_website': settings.require_website,
            'require_name': settings.require_name,
            'require_direct_contact': settings.require_direct_contact,
            'require_linkedin': settings.require_linkedin,
            'require_phone': settings.require_phone,
            'min_reviews': settings.min_reviews,
            'min_rating': settings.min_rating,
            'agency_services': settings.agency_services,
            'scoring_rules': settings.scoring_rules,
            'insight_generation_rules': settings.insight_generation_rules,
            'email_generation_rules': settings.email_generation_rules,
        })


# ══════════════════════════════════════════════════════════════════════════════
# SALES ACTION CENTER & OUTREACH VIEWS
# ══════════════════════════════════════════════════════════════════════════════

class SalesOverviewView(APIView):
    """
    Returns KPI metrics for the Sales Action Center:
    - Due today follow-ups
    - Overdue follow-ups
    - Upcoming follow-ups
    - Hot uncontacted leads (score >= 70)
    - Leads contacted this week
    - Active pipeline counts
    """
    def get(self, request):
        today = timezone.localdate()
        week_ago = timezone.now() - timedelta(days=7)

        # Scheduled follow-ups
        scheduled_qs = Lead.objects.filter(follow_up_status='scheduled')
        due_today = scheduled_qs.filter(follow_up_date=today).count()
        overdue = scheduled_qs.filter(follow_up_date__lt=today).count()
        upcoming = scheduled_qs.filter(follow_up_date__gt=today).count()

        # Follow-ups completed recently
        completed_today = Lead.objects.filter(follow_up_status='completed', updated_at__date=today).count()

        # High priority uncontacted leads (score >= 70 or score_label='hot')
        hot_uncontacted = (
            Lead.objects.filter(last_contacted_at__isnull=True)
            .exclude(status='unqualified')
            .filter(Q(score__gte=70) | Q(score_label='hot'))
            .count()
        )

        # Total uncontacted leads
        total_uncontacted = (
            Lead.objects.filter(last_contacted_at__isnull=True)
            .exclude(status='unqualified')
            .count()
        )

        # Contacted this week
        contacted_this_week = Lead.objects.filter(last_contacted_at__gte=week_ago).count()

        # Pipeline breakdown
        pipeline_counts = {
            'contacted': Lead.objects.filter(status='contacted').count(),
            'follow_up_scheduled': Lead.objects.filter(status='follow_up_scheduled').count(),
            'in_discussion': Lead.objects.filter(status='in_discussion').count(),
            'meeting_booked': Lead.objects.filter(status='meeting_booked').count(),
            'closed_won': Lead.objects.filter(status='closed_won').count(),
            'closed_lost': Lead.objects.filter(status='closed_lost').count(),
        }

        # ── 4 Client Action Buckets ──────────────────────────────────────────
        # 1. Send Today (Qualified, contact-ready, verified email, uncontacted)
        send_today_qs = (
            Lead.objects.filter(last_contacted_at__isnull=True)
            .exclude(status='unqualified')
            .filter(
                Q(company_email__contains='@') |
                Q(company_people__personal_email__contains='@') |
                Q(company_people__email__contains='@')
            )
            .filter(
                Q(score__gte=50) | Q(status='qualified') | Q(score_label__in=['hot', 'warm'])
            )
            .distinct()
        )
        send_today_count = send_today_qs.count()

        # 2. Follow-Up Today (Scheduled for today or overdue)
        follow_up_today_total = due_today + overdue

        # 3. Meetings / Opportunities (Active conversations, booked demos, open proposals)
        meetings_qs = Lead.objects.filter(
            Q(status__in=['in_discussion', 'meeting_booked', 'proposal_sent', 'opportunity', 'closed_won']) |
            Q(follow_up_action_type='meeting')
        )
        meetings_count = meetings_qs.count()

        # 4. Needs Research (Strong fit companies missing verified direct contact / email)
        needs_research_qs = (
            Lead.objects.filter(last_contacted_at__isnull=True)
            .exclude(status='unqualified')
            .filter(Q(score__gte=40) | Q(status__in=['new', 'qualified']))
            .exclude(id__in=send_today_qs.values_list('id', flat=True))
            .distinct()
        )
        needs_research_count = needs_research_qs.count()

        return Response({
            'today': today.isoformat(),
            'due_today': due_today,
            'overdue': overdue,
            'upcoming': upcoming,
            'completed_today': completed_today,
            'hot_uncontacted': hot_uncontacted,
            'total_uncontacted': total_uncontacted,
            'contacted_this_week': contacted_this_week,
            'pipeline': pipeline_counts,
            # The 4 Core Client Action Buckets
            'buckets': {
                'send_today': send_today_count,
                'follow_up_today': follow_up_today_total,
                'meetings': meetings_count,
                'needs_research': needs_research_count,
            },
            'send_today_count': send_today_count,
            'follow_up_today_count': follow_up_today_total,
            'meetings_count': meetings_count,
            'needs_research_count': needs_research_count,
        })


class SalesBucketLeadsView(APIView):
    """
    Returns prioritized leads according to the selected Client Action Bucket:
    - send_today: Qualified, contact-ready leads with verified email & decision maker.
    - follow_up_today: Leads scheduled for follow-up today or overdue.
    - meetings: Active conversations, booked meetings, proposals.
    - needs_research: Strong-fit companies missing verified contact or email.
    - all: All active pipeline leads.
    """
    def get(self, request):
        today = timezone.localdate()
        params = getattr(request, 'query_params', request.GET)
        bucket = params.get('bucket', 'send_today')
        search = params.get('search')
        min_score = params.get('min_score')

        qs = (
            Lead.objects.select_related('insight')
            .prefetch_related('company_people', 'lead_notes', 'activities', 'email_drafts')
        )

        if bucket == 'send_today':
            qs = (
                qs.filter(last_contacted_at__isnull=True)
                .exclude(status='unqualified')
                .filter(
                    Q(company_email__contains='@') |
                    Q(company_people__personal_email__contains='@') |
                    Q(company_people__email__contains='@')
                )
                .filter(
                    Q(score__gte=50) | Q(status='qualified') | Q(score_label__in=['hot', 'warm'])
                )
                .distinct()
                .order_by(F('score').desc(nulls_last=True), '-created_at')
            )
        elif bucket == 'follow_up_today':
            qs = (
                qs.filter(follow_up_status='scheduled', follow_up_date__lte=today)
                .order_by('follow_up_date', '-follow_up_priority', F('score').desc(nulls_last=True))
            )
        elif bucket == 'meetings':
            qs = (
                qs.filter(
                    Q(status__in=['in_discussion', 'meeting_booked', 'proposal_sent', 'opportunity', 'closed_won']) |
                    Q(follow_up_action_type='meeting')
                )
                .order_by('-updated_at')
            )
        elif bucket == 'needs_research':
            send_today_ids = (
                Lead.objects.filter(last_contacted_at__isnull=True)
                .exclude(status='unqualified')
                .filter(
                    Q(company_email__contains='@') |
                    Q(company_people__personal_email__contains='@') |
                    Q(company_people__email__contains='@')
                )
                .values_list('id', flat=True)
            )
            qs = (
                qs.filter(last_contacted_at__isnull=True)
                .exclude(status='unqualified')
                .filter(Q(score__gte=40) | Q(status__in=['new', 'qualified']))
                .exclude(id__in=send_today_ids)
                .distinct()
                .order_by(F('score').desc(nulls_last=True), '-created_at')
            )
        else: # 'all'
            qs = qs.exclude(status='unqualified').order_by(F('score').desc(nulls_last=True), '-created_at')

        if min_score:
            try:
                qs = qs.filter(score__gte=float(min_score))
            except (ValueError, TypeError):
                pass

        if search:
            search = search.strip()
            qs = qs.filter(
                Q(company_name__icontains=search) |
                Q(industry__icontains=search) |
                Q(city__icontains=search) |
                Q(company_people__full_name__icontains=search)
            ).distinct()

        # Pagination
        try:
            page = max(1, int(params.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        page_size = min(100, max(1, int(params.get('page_size', 50))))

        total_count = qs.count()
        start = (page - 1) * page_size
        end = start + page_size

        page_leads = qs[start:end]
        results = [_serialize_lead(l, detail=False) for l in page_leads]

        return Response({
            'bucket': bucket,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'results': results,
        })


class SalesFollowUpsView(APIView):
    """
    Returns leads in the follow-up queue based on type:
    - due_today: scheduled for today
    - overdue: scheduled before today
    - upcoming: scheduled after today
    - completed: completed follow-ups
    - all: all active follow-ups (overdue first, then today, then upcoming)
    """
    def get(self, request):
        today = timezone.localdate()
        queue_type = request.query_params.get('type', 'all')

        qs = (
            Lead.objects.select_related('insight')
            .prefetch_related('company_people', 'lead_notes', 'activities', 'email_drafts')
        )

        if queue_type == 'due_today':
            qs = qs.filter(follow_up_status='scheduled', follow_up_date=today)
        elif queue_type == 'overdue':
            qs = qs.filter(follow_up_status='scheduled', follow_up_date__lt=today)
        elif queue_type == 'upcoming':
            qs = qs.filter(follow_up_status='scheduled', follow_up_date__gt=today)
        elif queue_type == 'completed':
            qs = qs.filter(follow_up_status='completed').order_by('-updated_at')
        else:  # 'all'
            qs = qs.filter(follow_up_status='scheduled')

        if queue_type != 'completed':
            # Priority order: overdue (oldest date first), then today's, then high priority
            qs = qs.order_by('follow_up_date', '-follow_up_priority', '-score')

        limit = min(200, max(1, int(request.query_params.get('limit', 100))))
        results = [_serialize_lead(l) for l in qs[:limit]]

        return Response({
            'count': len(results),
            'queue_type': queue_type,
            'today': today.isoformat(),
            'results': results,
        })


class SalesLeadsToContactView(APIView):
    """
    Returns fresh, uncontacted qualified leads ordered strictly by highest AI score first (100 -> 0).
    SDRs can directly outreach to top opportunities.
    """
    def get(self, request):
        min_score = request.query_params.get('min_score')
        search = request.query_params.get('search')

        qs = (
            Lead.objects.filter(last_contacted_at__isnull=True)
            .exclude(status='unqualified')
            .exclude(follow_up_status='scheduled')
            .select_related('insight')
            .prefetch_related('company_people', 'lead_notes', 'email_drafts')
        )

        if min_score:
            try:
                qs = qs.filter(score__gte=float(min_score))
            except (ValueError, TypeError):
                pass

        if search:
            qs = qs.filter(
                Q(company_name__icontains=search) |
                Q(industry__icontains=search) |
                Q(company_people__full_name__icontains=search)
            ).distinct()

        # Strict ordering: Highest score first, then newest leads
        qs = qs.order_by(F('score').desc(nulls_last=True), '-created_at')

        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        page_size = min(100, max(1, int(request.query_params.get('page_size', 50))))

        total_count = qs.count()
        start = (page - 1) * page_size
        end = start + page_size

        page_leads = qs[start:end]
        results = [_serialize_lead(l) for l in page_leads]

        return Response({
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'results': results,
        })


class LeadScheduleFollowUpView(APIView):
    """
    Schedule or reschedule a follow-up for a lead.
    Sets follow_up_date, follow_up_time, follow_up_action_type, follow_up_priority, follow_up_notes.
    Logs an activity and note.
    """
    def post(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        data = request.data

        date_str = data.get('follow_up_date')
        if not date_str:
            return Response({'error': 'follow_up_date is required (YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Expected YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        lead.follow_up_date = parsed_date
        lead.follow_up_time = data.get('follow_up_time', '')
        lead.follow_up_action_type = data.get('follow_up_action_type', 'call')
        lead.follow_up_priority = data.get('follow_up_priority', 'medium')
        lead.follow_up_notes = data.get('follow_up_notes', '')
        lead.follow_up_status = 'scheduled'

        # If lead was in 'new' or 'qualified', move status to 'follow_up_scheduled'
        if lead.status in ['new', 'qualified']:
            lead.status = 'follow_up_scheduled'

        lead.save()

        # Log Activity
        action_name = lead.follow_up_action_type.capitalize()
        desc = f"Scheduled {action_name} follow-up for {lead.follow_up_date}"
        if lead.follow_up_time:
            desc += f" at {lead.follow_up_time}"
        if lead.follow_up_notes:
            desc += f": {lead.follow_up_notes}"

        username = request.user.username if request.user and request.user.is_authenticated else 'User'
        LeadActivity.objects.create(
            lead=lead,
            activity_type='follow_up_scheduled',
            description=desc,
            performed_by=username,
        )

        # Add timestamped note if notes were provided
        if lead.follow_up_notes:
            LeadNote.objects.create(
                lead=lead,
                note=f"[Follow-up Scheduled for {lead.follow_up_date} ({action_name})]: {lead.follow_up_notes}",
                created_by=username,
            )

        return Response({
            'success': True,
            'message': 'Follow-up scheduled successfully',
            'lead': _serialize_lead(lead),
        })


class LeadCompleteFollowUpView(APIView):
    """
    Marks a scheduled follow-up as completed.
    Optionally logs outcome notes and transitions status.
    """
    def post(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        completion_notes = request.data.get('notes', '').strip()
        new_status = request.data.get('new_status')

        valid_statuses = [choice[0] for choice in Lead.STATUS_CHOICES]
        if new_status and new_status not in valid_statuses:
            return Response(
                {'error': f"Invalid new_status '{new_status}'. Valid choices are: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        lead.follow_up_status = 'completed'
        if new_status:
            lead.status = new_status
        lead.save()

        desc = "Completed follow-up"
        if completion_notes:
            desc += f": {completion_notes}"

        username = request.user.username if request.user and request.user.is_authenticated else 'User'
        LeadActivity.objects.create(
            lead=lead,
            activity_type='follow_up_completed',
            description=desc,
            performed_by=username,
        )

        if completion_notes:
            LeadNote.objects.create(
                lead=lead,
                note=f"[Follow-up Completed]: {completion_notes}",
                created_by=username,
            )

        return Response({
            'success': True,
            'message': 'Follow-up marked as completed',
            'lead': _serialize_lead(lead),
        })


class LeadLogOutreachView(APIView):
    """
    Logs sales outreach (Call, Email, Meeting, LinkedIn).
    Sets last_contacted_at, updates status, and logs note/activity.
    """
    def post(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        data = request.data

        action_type = data.get('action_type', 'call')
        outcome = data.get('outcome', 'connected')
        notes = data.get('notes', '').strip()
        new_status = data.get('new_status')

        valid_statuses = [choice[0] for choice in Lead.STATUS_CHOICES]
        if new_status and new_status not in valid_statuses:
            return Response(
                {'error': f"Invalid new_status '{new_status}'. Valid choices are: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        lead.last_contacted_at = timezone.now()
        if new_status:
            lead.status = new_status
        elif lead.status in ['new', 'qualified']:
            lead.status = 'contacted'

        desc = f"Logged {action_type.title()} (Outcome: {outcome})"
        if notes:
            desc += f" — {notes}"
            lead.notes = notes

        # Single save — avoids double DB round-trip and race conditions
        lead.save()

        username = request.user.username if request.user and request.user.is_authenticated else 'User'
        LeadActivity.objects.create(
            lead=lead,
            activity_type=f"outreach_{action_type}",
            description=desc,
            performed_by=username,
        )

        if notes:
            LeadNote.objects.create(
                lead=lead,
                note=f"[{action_type.title()} - {outcome}]: {notes}",
                created_by=username,
            )

        return Response({
            'success': True,
            'message': 'Outreach logged successfully',
            'lead': _serialize_lead(lead),
        })


class LeadNotesView(APIView):
    """
    Get notes history or create a new note for a lead.
    """
    def get(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        notes = lead.lead_notes.all().order_by('-created_at')
        data = [
            {
                'id': n.id,
                'note': n.note,
                'created_by': n.created_by,
                'created_at': n.created_at.isoformat(),
            }
            for n in notes
        ]
        return Response(data)

    def post(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        note_text = request.data.get('note', '').strip()
        if not note_text:
            return Response({'error': 'Note text is required'}, status=status.HTTP_400_BAD_REQUEST)

        username = request.user.username if request.user and request.user.is_authenticated else 'User'
        note_obj = LeadNote.objects.create(
            lead=lead,
            note=note_text,
            created_by=username,
        )

        # Update latest notes summary on lead
        lead.notes = note_text
        lead.save()

        LeadActivity.objects.create(
            lead=lead,
            activity_type='note_added',
            description=note_text[:120],
            performed_by=username,
        )

        return Response({
            'id': note_obj.id,
            'note': note_obj.note,
            'created_by': note_obj.created_by,
            'created_at': note_obj.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)

