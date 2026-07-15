import logging
from django.db import transaction
from apps.crm.models import LeadQualificationSettings
from apps.lead_hunter.models import CampaignResult

logger = logging.getLogger(__name__)


class LeadQualificationAgent:
    """Agent that checks raw CampaignResults against dynamic qualification criteria."""

    @staticmethod
    def run(campaign_results=None):
        if campaign_results is None:
            campaign_results = CampaignResult.objects.filter(qualification_status='pending')
            
        settings = LeadQualificationSettings.get_settings()
        
        qualified_count = 0
        unqualified_count = 0
        
        for cr in campaign_results:
            passed = True
            
            # 1. Review Count Check
            review_count = cr.review_count or cr.raw_data.get('reviewsCount') or 0
            if int(review_count) < settings.min_reviews:
                passed = False
                
            # 2. Rating Check
            rating = cr.rating or cr.raw_data.get('totalScore') or 0.0
            if float(rating) < settings.min_rating:
                passed = False
                
            # 3. Website Check
            if settings.require_website and not (cr.website or cr.raw_data.get('website')):
                passed = False
                
            # 4. Phone Check
            if settings.require_phone and not (cr.company_phone or cr.raw_data.get('phone')):
                passed = False
                
            # 5. Name Check
            if settings.require_name and not (cr.name or cr.raw_data.get('title')):
                passed = False
                
            if passed:
                cr.qualification_status = 'qualified'
                cr.is_basic_qualified = True
                qualified_count += 1
            else:
                cr.qualification_status = 'unqualified'
                cr.is_basic_qualified = False
                unqualified_count += 1
                
            cr.save(update_fields=['qualification_status', 'is_basic_qualified'])
            
        logger.info(f"LeadQualificationAgent: Checked {len(campaign_results)} raw items, qualified {qualified_count}, unqualified {unqualified_count}.")
        
        return {
            'checked': len(campaign_results),
            'qualified': qualified_count,
            'unqualified': unqualified_count
        }
