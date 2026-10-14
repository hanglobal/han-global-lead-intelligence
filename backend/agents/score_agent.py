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
        ).prefetch_related('company_people').order_by('-created_at')[:batch_size]

        if not leads.exists():
            return {'scored': 0, 'remaining': 0}

        settings = LeadQualificationSettings.get_settings()
        scoring_rules = settings.scoring_rules
        ai_client = AIClient()

        scored_count = 0
        for lead in leads:
            try:
                person = lead.company_people.first()
                lead_data = {
                    'company_name': lead.company_name,
                    'company_email': lead.company_email,
                    'company_phone': lead.company_phone,
                    'website': lead.website or lead.company_website,
                    'company_domain': lead.company_domain,
                    'category': lead.category or lead.industry,
                    'industry': lead.industry,
                    'company_size': lead.company_size,
                    'company_annual_revenue': lead.company_annual_revenue,
                    'company_technologies': lead.company_technologies,
                    'address': lead.address or lead.company_full_address,
                    'city': lead.city,
                    'state': lead.state,
                    'country': lead.country,
                    'rating': lead.rating,
                    'review_count': lead.review_count,
                    'facebook_url': lead.facebook_url,
                    'instagram_url': lead.instagram_url,
                    'linkedin_url': (person.linkedin if person and person.linkedin else None) or lead.linkedin_url or lead.company_linkedin,
                    'google_maps_url': lead.google_maps_url,
                    # Decision maker direct contact details
                    'decision_maker_name': person.full_name if person else None,
                    'decision_maker_title': person.job_title if person else None,
                    'direct_email': (person.email or person.personal_email) if person else None,
                    'personal_email': person.personal_email if person else None,
                    'mobile_phone': person.mobile_number if person else None,
                    'person_linkedin': person.linkedin if person else None,
                }
                score_res = ai_client.calculate_lead_score(lead_data, scoring_rules)
                lead.score = score_res.get('score', 0)
                lead.score_label = Lead.calculate_score_label(lead.score)
                lead.save(update_fields=['score', 'score_label'])
                scored_count += 1
            except Exception as e:
                logger.warning(f"ScoreAgent: Failed to score lead {lead.id}: {e}")

        remaining = Lead.objects.filter(Q(score__isnull=True)).count()

        logger.info(f"ScoreAgent: scored {scored_count} leads, {remaining} remaining")
        return {'scored': scored_count, 'remaining': remaining}

    @staticmethod
    def run_async():
        from apps.crm.tasks import score_pending_leads

        score_pending_leads.delay()
