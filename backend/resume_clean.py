import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "reli.settings")
django.setup()

from apps.lead_hunter.models import Campaign, CampaignResult
from apps.crm.models import Lead
from apps.lead_hunter.pipeline import resume_campaign_pipeline

campaign = Campaign.objects.first()

# 1. Delete any CRM leads created from this campaign to ensure a clean import later
Lead.objects.filter(campaign_ref_id=campaign.id).delete()

# 2. Reset the flags and clean the raw data
results = CampaignResult.objects.filter(campaign_id=campaign.id, qualification_status='qualified')

for cr in results:
    cr.is_linkedin_processed = None
    cr.is_insights_processed = None
    cr.is_crm_synced = None
    
    if cr.raw_data:
        if 'linkedin_profiles' in cr.raw_data:
            del cr.raw_data['linkedin_profiles']
            
    if cr.ai_clean_data:
        if 'linkedin_profiles' in cr.ai_clean_data:
            del cr.ai_clean_data['linkedin_profiles']
        if 'insights' in cr.ai_clean_data:
            del cr.ai_clean_data['insights']
        if 'email_draft' in cr.ai_clean_data:
            del cr.ai_clean_data['email_draft']
            
    cr.save()

# 3. Resume campaign
campaign.status = 'running'
campaign.stage = 'linkedin_scraping'
campaign.save()

resume_campaign_pipeline(campaign)
print(f"Cleaned up {results.count()} leads from Apollo enrichment onwards and resumed Campaign {campaign.id}.")
