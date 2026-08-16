import logging
from django.db.models import Q
from apps.crm.models import Lead, LeadQualificationSettings
from services.ai_client import AIClient

logger = logging.getLogger(__name__)


class LeadScoreAgent:
    """Responsible for calculating and persisting lead scores.

    Does one thing: score leads. Can be called synchronously (for the
    bulk-score button) or asynchronously (via Celery after import).
    """

    @staticmethod
    def run(batch_size=100):
        leads = Lead.objects.filter(
            Q(score__isnull=True)
        ).order_by('-created_at')[:batch_size]

        if not leads.exists():
            return {'scored': 0, 'remaining': 0}

        settings = LeadQualificationSettings.get_settings()
        scoring_rules = settings.scoring_rules
        ai_client = AIClient()

        scored_count = 0
        for lead in leads:
            lead_data = {
                'company_email': lead.company_email,
                'company_phone': lead.company_phone,
                'website': lead.website,
                'rating': lead.rating,
                'review_count': lead.review_count,
                'facebook_url': lead.facebook_url,
                'instagram_url': lead.instagram_url,
                'linkedin_url': lead.linkedin_url,
                'address': lead.address,
                'category': lead.category,
                'google_maps_url': lead.google_maps_url,
            }
            score_res = ai_client.calculate_lead_score(lead_data, scoring_rules)
            lead.score = score_res.get('score', 0)
            lead.score_label = Lead.calculate_score_label(lead.score)
            lead.save(update_fields=['score', 'score_label'])
            scored_count += 1

        remaining = Lead.objects.filter(Q(score__isnull=True)).count()

        logger.info(f"ScoreAgent: scored {scored_count} leads, {remaining} remaining")
        return {'scored': scored_count, 'remaining': remaining}

    @staticmethod
    def run_async():
        from apps.crm.tasks import score_pending_leads

        score_pending_leads.delay()
