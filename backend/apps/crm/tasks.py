import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def score_pending_leads(self):
    """Score unscored/under-scored leads in batches of 100.

    Delegates to LeadScoreAgent; re-queues itself if more remain so that
    all leads get scored safely without blocking the request cycle.
    """
    from agents.score_agent import LeadScoreAgent
    from agents.qualification_agent import LeadQualificationAgent

    result = LeadScoreAgent.run()

    # After scoring, run qualification on new leads
    qual_result = LeadQualificationAgent.run()
    result['qualified'] = qual_result['qualified']

    if result['remaining'] > 0:
        score_pending_leads.delay()

    return result
