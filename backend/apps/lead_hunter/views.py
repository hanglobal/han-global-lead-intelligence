from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q, Sum
from .models import Campaign, CampaignResult
from .services import sync_campaign_results
from .events import (
    publish_campaign_update,
    publish_campaign_progress,
    log_campaign_event,
)
import logging

logger = logging.getLogger(__name__)


class CampaignListCreateView(APIView):
    def get(self, request):
        campaigns = Campaign.objects.all()
        data = [
            {
                'id': c.id,
                'campaign_id': c.campaign_id,
                'name': c.name,
                'description': c.description,
                'niche': c.niche,
                'location': c.location,
                'lead_count': c.lead_count,
                'total_leads_found': c.total_leads_found,
                'status': c.status,
                'stage': c.stage,
                'actor_type': c.actor_type,
                'nexus_campaign_id': c.nexus_campaign_id,
                'filters': c.filters,
                'created_at': c.created_at,
                'updated_at': c.updated_at,
            }
            for c in campaigns
        ]
        return Response(data)

    def post(self, request):
        actor_type = request.data.get('actor_type', 'nexus')
        raw_lead_count = request.data.get('lead_count')
        try:
            lead_count = min(1000, max(250, int(raw_lead_count))) if raw_lead_count is not None else 250
        except (ValueError, TypeError):
            lead_count = 250

        campaign = Campaign.objects.create(
            name=request.data.get('name', ''),
            description=request.data.get('description', ''),
            niche=request.data.get('niche', ''),
            location=request.data.get('location', ''),
            lead_count=lead_count,
            actor_type=actor_type,
            filters=request.data.get('filters', {}),
            stage='nexus_ingestion' if actor_type == 'nexus' else 'google_map_scraping',
        )
        return Response(
            {
                'id': campaign.id,
                'campaign_id': campaign.campaign_id,
                'name': campaign.name,
                'description': campaign.description,
                'status': campaign.status,
                'stage': campaign.stage,
                'actor_type': campaign.actor_type,
                'filters': campaign.filters,
                'created_at': campaign.created_at,
                'updated_at': campaign.updated_at,
            },
            status=status.HTTP_201_CREATED,
        )


class CampaignDetailView(APIView):
    def get(self, request, pk):
        campaign = get_object_or_404(Campaign, pk=pk)
        results = campaign.results.all()
        results_count = results.count()
        synced_count = results.filter(is_crm_synced=True).count()
        crawled_count = results.filter(is_website_scraped=True).count()
        llm_processed_count = results.filter(is_llm_processed=True).count()
        linkedin_processed_count = results.filter(is_linkedin_processed=True).count()
        insights_processed_count = results.filter(is_insights_processed=True).count()
        return Response(
            {
                'id': campaign.id,
                'campaign_id': campaign.campaign_id,
                'name': campaign.name,
                'description': campaign.description,
                'niche': campaign.niche,
                'location': campaign.location,
                'lead_count': campaign.lead_count,
                'status': campaign.status,
                'stage': campaign.stage,
                'actor_type': campaign.actor_type,
                'nexus_campaign_id': campaign.nexus_campaign_id,
                'filters': campaign.filters,
                'results_count': results_count,
                'is_crm_synced': synced_count,
                'crawled_count': crawled_count,
                'llm_processed_count': llm_processed_count,
                'linkedin_processed_count': linkedin_processed_count,
                'insights_processed_count': insights_processed_count,
                'created_at': campaign.created_at,
                'updated_at': campaign.updated_at,
            }
        )
    
    def patch(self, request, pk):
        campaign = get_object_or_404(Campaign, pk=pk)
        campaign.name = request.data.get('name', campaign.name)
        campaign.description = request.data.get('description', campaign.description)
        campaign.niche = request.data.get('niche', campaign.niche)
        campaign.location = request.data.get('location', campaign.location)
        if 'lead_count' in request.data:
            raw_lead_count = request.data.get('lead_count')
            try:
                campaign.lead_count = min(1000, max(250, int(raw_lead_count))) if raw_lead_count is not None else 250
            except (ValueError, TypeError):
                campaign.lead_count = 250
        if 'filters' in request.data:
            campaign.filters = request.data['filters']
        campaign.save()
        return Response(
            {
                'id': campaign.id,
                'campaign_id': campaign.campaign_id,
                'name': campaign.name,
                'description': campaign.description,
                'niche': campaign.niche,
                'location': campaign.location,
                'lead_count': campaign.lead_count,
                'status': campaign.status,
                'stage': campaign.stage,
                'actor_type': campaign.actor_type,
                'nexus_campaign_id': campaign.nexus_campaign_id,
                'filters': campaign.filters,
                'created_at': campaign.created_at,
                'updated_at': campaign.updated_at,
            }
        )
    
    def delete(self, request, pk):
        campaign = get_object_or_404(Campaign, pk=pk)
        campaign.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RunCampaignView(APIView):
    def post(self, request, pk):
        try:
            with transaction.atomic():
                campaign = get_object_or_404(Campaign.objects.select_for_update(), pk=pk)
                
                if campaign.status == 'running':
                    return Response({'error': 'Campaign is already running'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if this is an explicit re-run or re-running an already finished campaign
                is_rerun = (request.data.get('action') == 'rerun' or campaign.status == 'completed')

                # Only resume pipeline directly if the campaign was interrupted mid-processing
                if not is_rerun and campaign.results.exists() and campaign.stage not in ('nexus_ingestion', 'failed', 'pending', 'completed'):
                    campaign.status = 'running'
                    campaign.save()
                    
                    from apps.lead_hunter.pipeline import resume_campaign_pipeline
                    resume_campaign_pipeline(campaign)
                    
                    return Response({
                        'message': 'Campaign resumed successfully',
                        'status': campaign.status,
                        'run_id': campaign.nexus_campaign_id
                    })

                # Validate provider
                if campaign.actor_type and campaign.actor_type != 'nexus':
                    return Response(
                        {'error': f"Provider '{campaign.actor_type}' is not supported. Only 'nexus' is enabled."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                def normalize_list(val, to_lower=True):
                    if not val:
                        return None
                    items = val if isinstance(val, list) else [val]
                    cleaned = []
                    for item in items:
                        if isinstance(item, str):
                            s = item.strip()
                            if s:
                                cleaned.append(s.lower() if to_lower else s)
                        elif item:
                            cleaned.append(item)
                    return cleaned if cleaned else None

                filters = campaign.filters or {}
                if request.data.get('lead_count'):
                    try:
                        campaign.lead_count = min(1000, max(250, int(request.data.get('lead_count'))))
                        campaign.save(update_fields=['lead_count'])
                    except (ValueError, TypeError):
                        pass

                try:
                    fetch_count = min(1000, max(250, int(campaign.lead_count or 250)))
                except (ValueError, TypeError):
                    fetch_count = 250

                payload = {
                    "file_name": campaign.name or f"Campaign {campaign.campaign_id}",
                    "description": campaign.description or "",
                    "fetch_count": fetch_count,
                }

                if filters.get('contact_job_title'):
                    payload['contact_job_title'] = normalize_list(filters['contact_job_title'], to_lower=False)
                if filters.get('contact_not_job_title'):
                    payload['contact_not_job_title'] = normalize_list(filters['contact_not_job_title'], to_lower=False)
                if filters.get('seniority_level'):
                    payload['seniority_level'] = normalize_list(filters['seniority_level'], to_lower=True)
                if filters.get('functional_level'):
                    payload['functional_level'] = normalize_list(filters['functional_level'], to_lower=True)
                if filters.get('company_industry'):
                    payload['company_industry'] = normalize_list(filters['company_industry'], to_lower=True)
                elif campaign.niche:
                    payload['company_industry'] = normalize_list(campaign.niche, to_lower=True)
                if filters.get('company_not_industry'):
                    payload['company_not_industry'] = normalize_list(filters['company_not_industry'], to_lower=True)
                if filters.get('size'):
                    payload['size'] = normalize_list(filters['size'], to_lower=True)
                if filters.get('company_domain'):
                    payload['company_domain'] = normalize_list(filters['company_domain'], to_lower=True)
                if filters.get('company_keywords'):
                    payload['company_keywords'] = normalize_list(filters['company_keywords'], to_lower=False)
                if filters.get('company_not_keywords'):
                    payload['company_not_keywords'] = normalize_list(filters['company_not_keywords'], to_lower=False)
                if filters.get('contact_location'):
                    payload['contact_location'] = normalize_list(filters['contact_location'], to_lower=True)
                elif campaign.location:
                    payload['contact_location'] = normalize_list(campaign.location, to_lower=True)
                if filters.get('contact_not_location'):
                    payload['contact_not_location'] = normalize_list(filters['contact_not_location'], to_lower=True)
                if filters.get('contact_city'):
                    payload['contact_city'] = normalize_list(filters['contact_city'], to_lower=False)
                if filters.get('contact_not_city'):
                    payload['contact_not_city'] = normalize_list(filters['contact_not_city'], to_lower=False)
                if filters.get('funding'):
                    payload['funding'] = normalize_list(filters['funding'], to_lower=True)
                if filters.get('min_revenue'):
                    payload['min_revenue'] = filters['min_revenue']
                if filters.get('max_revenue'):
                    payload['max_revenue'] = filters['max_revenue']
                
                payload['email_status'] = normalize_list(filters.get('email_status', ['validated']), to_lower=True) or ['validated']
                payload = {k: v for k, v in payload.items() if v is not None}

                from services.nexus_client import nexus_client
                from apps.lead_hunter.tasks import poll_nexus_campaign_run

                nexus_res = nexus_client.run_campaign(payload)
                if 'error' in nexus_res:
                    err_msg = nexus_res.get('details') or nexus_res.get('error')
                    log_campaign_event(campaign, f"Failed to start Nexus campaign: {err_msg}", level='error')
                    return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)

                run_id = nexus_res.get('campaign_id') or nexus_res.get('uuid')
                if not run_id:
                    err_msg = "Nexus response did not return a valid campaign run ID."
                    logger.error(f"Failed to start Nexus campaign {campaign.campaign_id}: {nexus_res}")
                    log_campaign_event(campaign, f"Failed to start Nexus campaign: {err_msg}", level='error')
                    return Response({'error': err_msg, 'details': nexus_res}, status=status.HTTP_502_BAD_GATEWAY)

                campaign.status = 'running'
                campaign.stage = 'nexus_ingestion'
                campaign.nexus_campaign_id = run_id
                campaign.save()

                poll_nexus_campaign_run.apply_async(args=[campaign.id], countdown=5)
                logger.info(f"Campaign {campaign.campaign_id} started on Nexus with run {run_id}")
                log_campaign_event(campaign, f"Campaign started. Launched Nexus extraction run {run_id}.")

                return Response({
                    'message': 'Nexus campaign launched successfully',
                    'status': campaign.status,
                    'run_id': run_id
                })

        except ValueError as e:
            logger.error(f"Configuration error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Error starting campaign: {str(e)}")
            campaign.status = 'failed'
            campaign.save()
            return Response({'error': f'Failed to start campaign: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NexusBalanceView(APIView):
    def get(self, request):
        from services.nexus_client import nexus_client
        return Response(nexus_client.get_balance())


class NexusFiltersView(APIView):
    def get(self, request):
        from services.nexus_client import nexus_client
        return Response(nexus_client.get_filters())

class NexusCampaignListView(APIView):
    def get(self, request):
        from services.nexus_client import nexus_client
        return Response(nexus_client.list_campaigns())

class NexusCampaignRetryView(APIView):
    def post(self, request, campaign_id):
        from services.nexus_client import nexus_client
        return Response(nexus_client.retry_campaign(campaign_id))



class NexusFinancialAnalyticsView(APIView):
    def get(self, request):
        from services.nexus_client import nexus_client
        balance_info = nexus_client.get_balance()
        
        nexus_campaigns = Campaign.objects.filter(actor_type='nexus')
        nexus_aggregates = nexus_campaigns.aggregate(
            total_spent=Sum('billed_amount'),
            total_leads=Sum('total_leads_found'),
        )
        total_spent = float(nexus_aggregates['total_spent'] or 0.0)
        total_leads = int(nexus_aggregates['total_leads'] or 0)
        
        from apps.crm.models import Lead
        crm_aggregates = Lead.objects.filter(source='nexus').aggregate(
            total_crm_synced=Count('id'),
            total_qualified=Count('id', filter=Q(status='qualified')),
            total_unqualified=Count('id', filter=Q(status='unqualified')),
        )
        total_crm_synced = crm_aggregates['total_crm_synced']
        total_qualified = crm_aggregates['total_qualified']
        total_unqualified = crm_aggregates['total_unqualified']
        
        cost_per_lead = round(total_spent / total_leads, 4) if total_leads > 0 else 0.015
        cost_per_qualified = round(total_spent / total_qualified, 3) if total_qualified > 0 else 0.00
        
        campaigns_data = [
            {
                'id': c.id,
                'campaign_id': c.campaign_id,
                'name': c.name,
                'nexus_campaign_id': c.nexus_campaign_id,
                'status': c.status,
                'stage': c.stage,
                'lead_count': c.lead_count,
                'total_leads_found': c.total_leads_found,
                'billed_amount': float(c.billed_amount or 0.00),
                'billed_leads_count': c.billed_leads_count,
                'created_at': c.created_at,
            }
            for c in nexus_campaigns.order_by('-created_at')[:20]
        ]
        
        return Response({
            'prepaid_balance': balance_info.get('prepaid_balance', 0.0),
            'currency': balance_info.get('currency', 'USD'),
            'rate_per_1000': balance_info.get('pricing_per_1000_leads', 15.0),
            'api_status': balance_info.get('api_status', 'Active'),
            'total_spent': round(total_spent, 2),
            'total_leads_ingested': total_leads,
            'total_crm_synced': total_crm_synced,
            'total_qualified': total_qualified,
            'total_unqualified': total_unqualified,
            'cost_per_lead': cost_per_lead,
            'cost_per_qualified': cost_per_qualified,
            'campaigns': campaigns_data,
        })



class CampaignResultsView(APIView):
    def get(self, request, pk):
        campaign = get_object_or_404(Campaign, pk=pk)
        results = campaign.results.all()
        data = [
            {
                'id': r.id,
                'name': r.name,
                'address': r.address,
                'company_phone': r.company_phone,
                'website': r.website,
                'rating': r.rating,
                'review_count': r.review_count,
                'category': r.category,
                'is_crm_synced': r.is_crm_synced,
            }
            for r in results
        ]
        return Response({'campaign': campaign.name, 'results': data})


class CampaignStatsView(APIView):
    def get(self, request):
        campaign_stats = Campaign.objects.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='pending')),
            running=Count('id', filter=Q(status='running')),
            completed=Count('id', filter=Q(status='completed')),
            failed=Count('id', filter=Q(status='failed')),
        )
        results_stats = CampaignResult.objects.aggregate(
            total_results=Count('id'),
            synced_results=Count('id', filter=Q(is_crm_synced=True)),
        )
        return Response({
            'total': campaign_stats['total'],
            'by_status': {
                'pending': campaign_stats['pending'],
                'running': campaign_stats['running'],
                'completed': campaign_stats['completed'],
                'failed': campaign_stats['failed'],
            },
            'total_results': results_stats['total_results'],
            'is_crm_synced': results_stats['synced_results'],
        })


from django.http import StreamingHttpResponse, HttpResponse
from django.views import View
from rest_framework.authentication import BasicAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

class RealtimeStreamView(View):
    """
    Provides an authenticated persistent SSE stream to push real-time updates to the Next.js frontend.
    Uses a plain Django View (NOT DRF APIView) to avoid content-type negotiation 406 errors,
    and enforces authentication via SimpleJWT Bearer tokens, BasicAuthentication, or Django session.
    """

    def get(self, request):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            # 1. Try JWT from Authorization header or ?token= query parameter
            try:
                auth_header = request.headers.get('Authorization', '')
                if not auth_header and request.GET.get('token'):
                    request.META['HTTP_AUTHORIZATION'] = f"Bearer {request.GET.get('token')}"
                jwt_auth = JWTAuthentication().authenticate(request)
                if jwt_auth is not None:
                    user = jwt_auth[0]
            except Exception as e:
                logger.debug(f"SSE JWT auth check failed: {e}")

        if not user or not user.is_authenticated:
            # 2. Try Basic Authentication
            try:
                auth_result = BasicAuthentication().authenticate(request)
                if auth_result is not None:
                    user = auth_result[0]
            except AuthenticationFailed:
                return HttpResponse("Invalid credentials", status=401)
            except Exception as e:
                logger.debug(f"SSE Basic auth check failed: {e}")

        if not user or not user.is_authenticated:
            return HttpResponse("Authentication required", status=401)

        import asyncio
        import redis.asyncio as aioredis

        async def event_stream():
            r = aioredis.from_url(settings.CELERY_BROKER_URL)
            pubsub = r.pubsub()
            await pubsub.subscribe('realtime-crm')

            # Send initial connection confirmation event
            yield "data: {\"type\": \"connected\"}\n\n"

            loop = asyncio.get_running_loop()
            last_ping = loop.time()
            try:
                while True:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message and message.get('type') == 'message':
                        raw_data = message['data']
                        if isinstance(raw_data, bytes):
                            raw_data = raw_data.decode('utf-8')
                        yield f"data: {raw_data}\n\n"
                    # Send a keep-alive comment every 30s to prevent proxy/nginx timeouts
                    now = loop.time()
                    if now - last_ping > 30:
                        yield ": keep-alive\n\n"
                        last_ping = now
                    await asyncio.sleep(0.2)
            except (GeneratorExit, asyncio.CancelledError):
                pass
            except Exception as e:
                logger.error(f"Error in SSE stream: {e}")
            finally:
                try:
                    await pubsub.unsubscribe('realtime-crm')
                    await pubsub.close()
                    await r.close()
                except Exception:
                    pass

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response['Cache-Control'] = 'no-cache, must-revalidate'
        response['X-Accel-Buffering'] = 'no'
        # Use explicit allowed origins from Django settings — never wildcard
        origin = request.headers.get('Origin', '')
        allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        if origin in allowed_origins:
            response['Access-Control-Allow-Origin'] = origin
        return response


class CampaignLogsView(APIView):
    def get(self, request, pk):
        from .models import Campaign, CampaignLog
        campaign = get_object_or_404(Campaign, pk=pk)
        logs = CampaignLog.objects.filter(campaign=campaign).order_by('created_at')
        data = [{
            'message': log.message,
            'level': log.level,
            'created_at': log.created_at.isoformat(),
        } for log in logs]
        return Response(data)
