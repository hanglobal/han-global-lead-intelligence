from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import Campaign, CampaignResult
from .apify_service import run_apify_scraper, fetch_apify_results, check_run_status
from .services import sync_campaign_results
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
                'apify_task_id': c.apify_task_id,
                'created_at': c.created_at,
                'updated_at': c.updated_at,
            }
            for c in campaigns
        ]
        return Response(data)

    def post(self, request):
        campaign = Campaign.objects.create(
            name=request.data.get('name', ''),
            description=request.data.get('description', ''),
            niche=request.data.get('niche', ''),
            location=request.data.get('location', ''),
            lead_count=request.data.get('lead_count'),
        )
        return Response(
            {
                'id': campaign.id,
                'campaign_id': campaign.campaign_id,
                'name': campaign.name,
                'description': campaign.description,
                'status': campaign.status,
                'stage': campaign.stage,
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
        apollo_processed_count = results.filter(is_apollo_processed=True).count()
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
                'apify_task_id': campaign.apify_task_id,
                'results_count': results_count,
                'is_crm_synced': synced_count,
                'crawled_count': crawled_count,
                'llm_processed_count': llm_processed_count,
                'apollo_processed_count': apollo_processed_count,
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
        campaign.lead_count = request.data.get('lead_count', campaign.lead_count)
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
                'apify_task_id': campaign.apify_task_id,
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
        campaign = get_object_or_404(Campaign, pk=pk)
        
        if campaign.status == 'running':
            return Response({'error': 'Campaign is already running'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            # If we are past the initial scraping stage, we just resume the pipeline.
            if campaign.stage != 'google_map_scraping':
                # This is a retry or resume - run the pipeline directly
                campaign.status = 'running'
                campaign.save()
                
                from apps.lead_hunter.pipeline import resume_campaign_pipeline
                resume_campaign_pipeline(campaign)
                
                return Response({
                    'message': 'Campaign resumed successfully',
                    'status': campaign.status,
                    'run_id': campaign.apify_task_id
                })

            # Run the Apify scraper
            run_id = run_apify_scraper(campaign)
            
            # Update campaign status and store run ID
            campaign.status = 'running'
            campaign.apify_task_id = run_id
            campaign.save()

            # Kick off Celery polling task as fallback (webhook is primary)
            from apps.lead_hunter.tasks import poll_apify_run
            poll_apify_run.apply_async(args=[campaign.id], countdown=30)
            logger.info(f"Campaign {campaign.campaign_id} started with Apify run {run_id}")
            log_campaign_event(campaign, f"Campaign started. Initiating Apify run {run_id} for Google Maps scraping.")
            
            return Response({
                'message': 'Campaign started successfully',
                'status': campaign.status,
                'run_id': run_id
            })
        except ValueError as e:
            logger.error(f"Apify configuration error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Error starting campaign: {str(e)}")
            campaign.status = 'failed'
            campaign.save()
            return Response({'error': f'Failed to start campaign: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        total = Campaign.objects.count()
        status_counts = {
            'pending': Campaign.objects.filter(status='pending').count(),
            'running': Campaign.objects.filter(status='running').count(),
            'completed': Campaign.objects.filter(status='completed').count(),
            'failed': Campaign.objects.filter(status='failed').count(),
        }
        total_results = CampaignResult.objects.count()
        synced_results = CampaignResult.objects.filter(is_crm_synced=True).count()
        return Response({
            'total': total,
            'by_status': status_counts,
            'total_results': total_results,
            'is_crm_synced': synced_results,
        })


class CheckCampaignStatusView(APIView):
    """Check and update campaign status from Apify."""
    
    def get(self, request, pk):
        campaign = get_object_or_404(Campaign, pk=pk)
        
        if not campaign.apify_task_id:
            return Response({'status': campaign.status})
        
        try:
            run_info = check_run_status(campaign.apify_task_id)
            apify_status = run_info.get('status')
            
            # If Apify run is finished, fetch results and sync to CRM
            if apify_status in ['SUCCEEDED', 'FINISHED'] and campaign.status == 'running':
                self._process_results(campaign, run_info.get('defaultDatasetId'))
            
            return Response({
                'status': campaign.status,
                'apify_status': apify_status,
                'apify_task_id': campaign.apify_task_id,
                'results_count': campaign.results.count(),
                'is_crm_synced': campaign.results.filter(is_crm_synced=True).count(),
            })
        except Exception as e:
            logger.error(f"Error checking campaign status: {str(e)}")
            return Response({
                'status': campaign.status,
                'apify_task_id': campaign.apify_task_id,
                'error': str(e)
            })
    
    def _process_results(self, campaign, dataset_id):
        """Fetch results from Apify and sync to CRM."""
        if not dataset_id:
            return

        results, _status = fetch_apify_results(campaign.apify_task_id)
        if results is None:
            return

        stats = sync_campaign_results(campaign, results)

        campaign.status = 'running'
        campaign.total_leads_found = stats.get('total', 0)
        campaign.save(update_fields=['status', 'total_leads_found'])

        logger.info(
            f"Campaign {campaign.campaign_id} Apify step completed via status-check. "
            f"Total: {stats['total']}, Synced: {stats['synced']}, "
            f"Batch dupes: {stats['batch_duplicates']}, CRM dupes: {stats['crm_duplicates']}"
        )
        log_campaign_event(campaign, f"Apify scraping completed via status check. Found {stats['total']} leads.")
        log_campaign_event(campaign, f"Starting deduplication and basic qualification.")
        publish_campaign_update(campaign, stats)
        
        from apps.lead_hunter.pipeline import resume_campaign_pipeline
        resume_campaign_pipeline(campaign)


class ApifyWebhookView(APIView):
    """Webhook for Apify to call when run is complete."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Handle webhook from Apify."""
        payload = request.data
        
        run_id = payload.get('runId') or payload.get('actorRunId')
        event_type = payload.get('eventType')
        
        logger.info(f"Received Apify webhook: {event_type} for run {run_id}")
        
        if event_type != 'ACTOR.RUN.SUCCEEDED':
            return Response({'status': 'ignored'})
        
        # Find campaign with this run ID
        try:
            campaign = Campaign.objects.get(apify_task_id=run_id)
        except Campaign.DoesNotExist:
            logger.warning(f"No campaign found for Apify run {run_id}")
            return Response({'status': 'not_found'})
        
        # Process results
        results, status = fetch_apify_results(run_id)
        
        if results:
            stats = sync_campaign_results(campaign, results)

            campaign.status = 'running'
            campaign.total_leads_found = stats.get('total', 0)
            campaign.save()
            
            logger.info(f"Campaign {campaign.campaign_id} Apify step completed via webhook. "
                        f"Total: {stats['total']}, Synced: {stats['synced']}, "
                        f"Batch dupes: {stats['batch_duplicates']}, CRM dupes: {stats['crm_duplicates']}")
            log_campaign_event(campaign, f"Apify scraping completed via webhook. Found {stats['total']} leads.")
            log_campaign_event(campaign, f"Starting deduplication and basic qualification.")
            
            publish_campaign_update(campaign, stats)
            
            from apps.lead_hunter.pipeline import resume_campaign_pipeline
            resume_campaign_pipeline(campaign)
        
        return Response({'status': 'processed'})


def publish_campaign_update(campaign, stats):
    """Publish a real-time event to the Redis pubsub channel."""
    try:
        import redis
        import json
        r = redis.Redis.from_url(settings.CELERY_BROKER_URL)
        r.publish('realtime-crm', json.dumps({
            'type': 'CAMPAIGN_COMPLETED',
            'campaign_id': campaign.campaign_id,
            'id': campaign.id,
            'status': campaign.status,
            'stage': campaign.stage,
            'total': stats.get('total', 0),
            'synced': stats.get('synced', 0),
            'batch_duplicates': stats.get('batch_duplicates', 0),
            'crm_duplicates': stats.get('crm_duplicates', 0),
            'crawled_count': campaign.results.filter(is_website_scraped=True).count(),
            'llm_processed_count': campaign.results.filter(is_llm_processed=True).count(),
            'apollo_processed_count': campaign.results.filter(is_apollo_processed=True).count(),
            'linkedin_processed_count': campaign.results.filter(is_linkedin_processed=True).count(),
            'insights_processed_count': campaign.results.filter(is_insights_processed=True).count(),
        }))
        logger.info(f"Published real-time CAMPAIGN_COMPLETED event for {campaign.campaign_id}")
    except Exception as e:
        logger.warning(f"Failed to publish CAMPAIGN_COMPLETED event: {e}")

def publish_campaign_progress(campaign):
    """Publish a real-time progress update to the Redis pubsub channel."""
    try:
        import redis
        import json
        
        r = redis.Redis.from_url(settings.CELERY_BROKER_URL)
        results = campaign.results.all()
        results_count = results.count()
        synced_count = results.filter(is_crm_synced=True).count()
        crawled_count = results.filter(is_website_scraped=True).count()
        llm_processed_count = results.filter(is_llm_processed=True).count()
        apollo_processed_count = results.filter(is_apollo_processed=True).count()
        linkedin_processed_count = results.filter(is_linkedin_processed=True).count()
        insights_processed_count = results.filter(is_insights_processed=True).count()

        r.publish('realtime-crm', json.dumps({
            'type': 'CAMPAIGN_PROGRESS',
            'campaign_id': campaign.campaign_id,
            'id': campaign.id,
            'status': campaign.status,
            'stage': campaign.stage,
            'total_leads_found': campaign.total_leads_found,
            'results_count': results_count,
            'is_crm_synced': synced_count,
            'crawled_count': crawled_count,
            'llm_processed_count': llm_processed_count,
            'apollo_processed_count': apollo_processed_count,
            'linkedin_processed_count': linkedin_processed_count,
            'insights_processed_count': insights_processed_count,
        }))
    except Exception as e:
        logger.warning(f"Failed to publish CAMPAIGN_PROGRESS event: {e}")


from django.http import StreamingHttpResponse

class RealtimeStreamView(APIView):
    """Provides a persistent SSE stream to push real-time updates to the Next.js frontend."""
    
    def get(self, request):
        def event_stream():
            import redis
            r = redis.Redis.from_url(settings.CELERY_BROKER_URL)
            pubsub = r.pubsub()
            pubsub.subscribe('realtime-crm')
            
            # Send initial keep-alive / connection event
            yield "data: {\"type\": \"connected\"}\n\n"
            
            try:
                for message in pubsub.listen():
                    if message['type'] == 'message':
                        yield f"data: {message['data'].decode('utf-8')}\n\n"
            except GeneratorExit:
                pubsub.unsubscribe('realtime-crm')
            except Exception as e:
                logger.error(f"Error in SSE stream: {e}")

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response['Cache-Control'] = 'no-cache, must-revalidate'
        response['X-Accel-Buffering'] = 'no'
        response['Access-Control-Allow-Origin'] = '*'
        return response

def log_campaign_event(campaign, message, level='info'):
    """Save a log to the database and broadcast it via SSE."""
    try:
        from .models import CampaignLog
        log = CampaignLog.objects.create(campaign=campaign, message=message, level=level)
        
        import redis
        import json
        from django.conf import settings
        r = redis.Redis.from_url(settings.CELERY_BROKER_URL)
        r.publish('realtime-crm', json.dumps({
            'type': 'CAMPAIGN_LOG',
            'campaign_id': campaign.campaign_id,
            'id': campaign.id,
            'log': {
                'message': log.message,
                'level': log.level,
                'created_at': log.created_at.isoformat(),
            }
        }))
    except Exception as e:
        logger.warning(f"Failed to save/publish CAMPAIGN_LOG: {e}")

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
