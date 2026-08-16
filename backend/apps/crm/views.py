from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Count
from .models import Lead, LeadActivity, CompanyPerson, LeadQualificationSettings
from agents.score_agent import LeadScoreAgent
# from apps.enrichment.tasks import scrape_lead_website_task


def _serialize_lead(l):
    """Single source of truth for Lead serialization."""
    
    # Safely get the latest enrichment
    firecrawl_raw_data = None
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

    return {
        'id': l.id,
        'lid': l.lid,
        'place_id': l.place_id,
        'name': l.name,
        'source': l.source,
        'address': l.address,
        'street_address': l.street_address,
        'neighborhood': l.neighborhood,
        'city': l.city,
        'postal_code': l.postal_code,
        'company_phone': l.company_phone,
        'website': l.website,
        'google_maps_url': l.google_maps_url,
        'company_email': l.company_email,
        'rating': l.rating,
        'review_count': l.review_count,
        'price_level': l.price_level,
        'category': l.category,
        'fid': l.fid,
        'latitude': l.latitude,
        'longitude': l.longitude,
        'status': l.status,
        'stage': getattr(l, 'stage', None),
        'notes': l.notes,
        'tags': l.tags,
        'score': l.score,
        'score_label': l.score_label,
        'working_hours': getattr(l, 'working_hours', None),
        'classification': l.classification,
        'campaign_id': l.campaign_id,
        'source_campaign_id': l.source_campaign_id,
        'facebook_url': l.facebook_url,
        'twitter_url': l.twitter_url,
        'instagram_url': l.instagram_url,
        'linkedin_url': l.linkedin_url,
        'youtube_url': l.youtube_url,
        'social_links': l.social_links,
        'crm_signals': l.crm_signals,
        'raw_data': l.raw_data,
        'firecrawl_raw_data': firecrawl_raw_data,
        'ai_reasoning': l.ai_reasoning,
        'scraped_at': l.scraped_at,
        'created_at': l.created_at,
        'updated_at': l.updated_at,
        'insight': insight_data,
        'email_drafts': email_drafts_data,
    }


class LeadListCreateView(APIView):
    def get(self, request):
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')
        
        leads = Lead.objects.all().select_related('insight').prefetch_related('enrichments', 'email_drafts')
        
        if status_filter:
            leads = leads.filter(status=status_filter)
        
        if search:
            leads = leads.filter(name__icontains=search) | leads.filter(address__icontains=search)
        
        campaign_ids = request.query_params.get('campaign_id')
        if campaign_ids:
            ids_list = [cid.strip() for cid in campaign_ids.split(',') if cid.strip()]
            if ids_list:
                leads = leads.filter(campaign_id__in=ids_list)
        
        data = [_serialize_lead(l) for l in leads]
        return Response(data)

    def post(self, request):
        place_id = request.data.get('place_id', '')
        if place_id and Lead.objects.filter(place_id=place_id).exists():
            return Response(
                {'error': 'Lead with this place_id already exists', 'place_id': place_id},
                status=status.HTTP_409_CONFLICT,
            )
        lead = Lead.objects.create(
            place_id=place_id,
            name=request.data.get('name', ''),
            address=request.data.get('address', ''),
            street_address=request.data.get('street_address'),
            neighborhood=request.data.get('neighborhood'),
            city=request.data.get('city'),
            postal_code=request.data.get('postal_code'),
            company_phone=request.data.get('company_phone'),
            source=request.data.get('source'),
            website=request.data.get('website'),
            google_maps_url=request.data.get('google_maps_url'),
            company_email=request.data.get('company_email'),
            rating=request.data.get('rating'),
            review_count=request.data.get('review_count'),
            price_level=request.data.get('price_level'),
            category=request.data.get('category'),
            fid=request.data.get('fid'),
            latitude=request.data.get('latitude'),
            longitude=request.data.get('longitude'),
            scraped_at=request.data.get('scraped_at'),
        )
        return Response(
            {
                'id': lead.id,
                'lid': lead.lid,
                'name': lead.name,
                'status': lead.status,
            },
            status=status.HTTP_201_CREATED,
        )


class LeadDetailView(APIView):
    def get(self, request, pk):
        lead = get_object_or_404(Lead.objects.select_related('insight').prefetch_related('enrichments', 'email_drafts'), pk=pk)
        data = _serialize_lead(lead)
        return Response(data)

    def delete(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        lead.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LeadScrapeView(APIView):
    def post(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        if not lead.website:
            return Response({'error': 'Lead has no website to scrape'}, status=status.HTTP_400_BAD_REQUEST)
        
        # scrape_lead_website_task.delay(lead.id)
        return Response({'status': 'Scrape task started (Not Implemented)'})


class LeadStatusUpdateView(APIView):
    def patch(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        lead.status = request.data.get('status', lead.status)
        lead.save()
        LeadActivity.objects.get_or_create(
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


class BulkImportLeadsView(APIView):
    """Bulk import leads with dedup — skips duplicates within batch and in DB."""

    def post(self, request):
        items = request.data
        validate_only = request.query_params.get('validate') == 'true'

        if not isinstance(items, list):
            return Response({'error': 'Expected a list of leads'}, status=status.HTTP_400_BAD_REQUEST)

        seen = {}
        for item in items:
            pid = item.get('place_id', '')
            if not pid:
                continue
            if pid not in seen:
                seen[pid] = item

        existing_pids = set(Lead.objects.filter(place_id__in=seen.keys()).values_list('place_id', flat=True))

        to_create = []
        for pid, item in seen.items():
            if pid in existing_pids:
                continue
            to_create.append(item)

        if not validate_only and to_create:
            with transaction.atomic():
                for item in to_create:
                    Lead.objects.create(
                        place_id=item['place_id'],
                        name=item.get('name', ''),
                        address=item.get('address', ''),
                        street_address=item.get('street_address'),
                        neighborhood=item.get('neighborhood'),
                        city=item.get('city'),
                        postal_code=item.get('postal_code'),
                        company_phone=item.get('company_phone'),
                        source=item.get('source'),
                        website=item.get('website'),
                        google_maps_url=item.get('google_maps_url'),
                        company_email=item.get('company_email'),
                        rating=item.get('rating'),
                        review_count=item.get('review_count'),
                        price_level=item.get('price_level'),
                        category=item.get('category'),
                        fid=item.get('fid'),
                        latitude=item.get('latitude'),
                        longitude=item.get('longitude'),
                        scraped_at=item.get('scraped_at'),
                    )

        return Response({
            'total': len(items),
            'batch_duplicates': len(items) - len(seen),
            'crm_duplicates': len(seen) - len(to_create),
            'unique_to_import': len(to_create),
            'validate_only': validate_only,
        })


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


def _serialize_person(p):
    return {
        'id': p.id,
        'lead_id': p.lead_id,
        'companyperson_name': p.companyperson_name,
        'role': p.role,
        'email': p.email,
        'phone': p.phone,
        'linkedin_url': p.linkedin_url,
        'website': p.website,
        'is_primary': p.is_primary,
        'created_at': p.created_at.isoformat() if p.created_at else None,
        'updated_at': p.updated_at.isoformat() if p.updated_at else None,
    }


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
        name = (data.get('companyperson_name') or '').strip()
        if not name:
            return Response(
                {'error': 'companyperson_name is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            with transaction.atomic():
                person = CompanyPerson.objects.create(
                    lead=lead,
                    companyperson_name=name,
                    role=(data.get('role') or '').strip(),
                    email=data.get('email') or None,
                    phone=data.get('phone') or None,
                    linkedin_url=data.get('linkedin_url') or None,
                    website=data.get('website') or None,
                    is_primary=bool(data.get('is_primary', False)),
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
        editable = ['companyperson_name', 'role', 'email', 'phone', 'linkedin_url', 'website', 'is_primary']
        try:
            with transaction.atomic():
                for field in editable:
                    if field in data:
                        value = data[field]
                        if field == 'companyperson_name' and value is not None:
                            value = str(value).strip()
                            if not value:
                                return Response(
                                    {'error': 'companyperson_name cannot be empty'},
                                    status=status.HTTP_400_BAD_REQUEST,
                                )
                        if field in ('email', 'phone', 'linkedin_url', 'website', 'role') and isinstance(value, str):
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


class SetPrimaryPersonView(APIView):
    def patch(self, request, pk, person_id):
        person = get_object_or_404(CompanyPerson, pk=person_id, lead_id=pk)
        with transaction.atomic():
            CompanyPerson.objects.filter(lead=person.lead, is_primary=True).exclude(pk=person.pk).update(is_primary=False)
            person.is_primary = True
            person.save(update_fields=['is_primary', 'updated_at'])
        return Response(_serialize_person(person))


class LeadQualificationSettingsView(APIView):
    def get(self, request):
        settings = LeadQualificationSettings.get_settings()
        return Response({
            'min_reviews': settings.min_reviews,
            'min_rating': settings.min_rating,
            'require_website': settings.require_website,
            'require_phone': settings.require_phone,
            'require_name': settings.require_name,
            'agency_services': settings.agency_services,
            'scoring_rules': settings.scoring_rules,
            'insight_generation_rules': settings.insight_generation_rules,
            'email_generation_rules': settings.email_generation_rules,
        })

    def patch(self, request):
        settings = LeadQualificationSettings.get_settings()
        data = request.data
        if 'min_reviews' in data: settings.min_reviews = int(data['min_reviews'])
        if 'min_rating' in data: settings.min_rating = float(data['min_rating'])
        if 'require_website' in data: settings.require_website = bool(data['require_website'])
        if 'require_phone' in data: settings.require_phone = bool(data['require_phone'])
        if 'require_name' in data: settings.require_name = bool(data['require_name'])
        if 'agency_services' in data: settings.agency_services = str(data['agency_services'])
        if 'scoring_rules' in data: settings.scoring_rules = str(data['scoring_rules'])
        if 'insight_generation_rules' in data: settings.insight_generation_rules = str(data['insight_generation_rules'])
        if 'email_generation_rules' in data: settings.email_generation_rules = str(data['email_generation_rules'])
        settings.save()
        return Response({
            'status': 'success',
            'min_reviews': settings.min_reviews,
            'min_rating': settings.min_rating,
            'require_website': settings.require_website,
            'require_phone': settings.require_phone,
            'require_name': settings.require_name,
            'agency_services': settings.agency_services,
            'scoring_rules': settings.scoring_rules,
            'insight_generation_rules': settings.insight_generation_rules,
            'email_generation_rules': settings.email_generation_rules,
        })
