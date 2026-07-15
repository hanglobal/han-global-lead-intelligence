import logging
from django.db.models import Q
from apps.crm.models import Lead

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

        scored_count = 0
        for lead in leads:
            lead.score = lead.calculate_score()
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
