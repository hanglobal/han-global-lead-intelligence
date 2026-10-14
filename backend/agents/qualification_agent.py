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
            raw = cr.raw_data or {}
            reasons = []
            
            # 1. Website Check
            if settings.require_website:
                has_website = bool(
                    cr.website or 
                    raw.get('company_website') or 
                    raw.get('company_domain') or 
                    raw.get('website')
                )
                if not has_website:
                    reasons.append("Missing website")
                
            # 2. Decision Maker Name Check
            if settings.require_name:
                dm_name = (
                    raw.get('full_name') or 
                    f"{raw.get('first_name', '')} {raw.get('last_name', '')}".strip() or 
                    cr.name or 
                    raw.get('title')
                )
                if not dm_name:
                    reasons.append("Missing decision maker name")
                
            # 3. Direct Contact Info Check (At least 1: email, personal_email, or mobile_number)
            # Note: Company general phone is NOT counted as direct contact info
            if settings.require_direct_contact:
                direct_email = raw.get('email')
                personal_email = raw.get('personal_email')
                mobile_number = raw.get('mobile_number')
                
                has_direct_contact = bool(direct_email or personal_email or mobile_number)
                if not has_direct_contact:
                    reasons.append("Missing direct contact info (email/mobile)")

            # 4. Optional LinkedIn URL Check
            if settings.require_linkedin:
                has_linkedin = bool(raw.get('linkedin') or raw.get('company_linkedin') or (cr.raw_data or {}).get('linkedin'))
                if not has_linkedin:
                    reasons.append("Missing LinkedIn URL")
                
            if len(reasons) == 0:
                cr.qualification_status = 'qualified'
                cr.is_basic_qualified = True
                qualified_count += 1
            else:
                cr.qualification_status = 'unqualified'
                cr.is_basic_qualified = False
                ai_data = cr.ai_clean_data or {}
                ai_data['is_ideal_customer'] = False
                ai_data['qualification_reasoning'] = f"Basic criteria failed: {', '.join(reasons)}"
                cr.ai_clean_data = ai_data
                unqualified_count += 1
                
            cr.save(update_fields=['qualification_status', 'is_basic_qualified', 'ai_clean_data'])
            
        logger.info(f"LeadQualificationAgent: Checked {len(campaign_results)} items -> qualified: {qualified_count}, unqualified: {unqualified_count}.")
        
        return {
            'checked': len(campaign_results),
            'qualified': qualified_count,
            'unqualified': unqualified_count
        }
