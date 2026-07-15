import os, sys, django
sys.path.append('/home/owais/reli/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.lead_hunter.models import Campaign, CampaignResult
from apps.lead_hunter.views import publish_campaign_progress
from agents.import_agent import LeadImportAgent

try:
    c = Campaign.objects.get(id=12)
    # Get all qualified leads that are stuck
    stuck_leads = CampaignResult.objects.filter(campaign=c, qualification_status='qualified')
    
    count = 0
    for cr in stuck_leads:
        if cr.is_website_scraped is False and cr.is_llm_processed is None:
            cr.qualification_status = 'unqualified'
            ai_data = cr.ai_clean_data or {}
            ai_data["is_ideal_customer"] = False
            ai_data["qualification_reasoning"] = "Lead Rejected: Website scraping failed or no website found."
            cr.ai_clean_data = ai_data
            cr.is_llm_processed = True
            cr.is_apollo_processed = False
            cr.save(update_fields=['qualification_status', 'ai_clean_data', 'is_llm_processed', 'is_apollo_processed'])
            LeadImportAgent.run_unqualified([cr])
            count += 1
            
    # Mark campaign as completed
    c.stage = 'completed'
    c.status = 'completed'
    c.save(update_fields=['stage', 'status'])
    publish_campaign_progress(c)
    
    print(f"Fixed {count} stuck leads for Campaign 12 and marked as completed.")
except Exception as e:
    print("Error:", e)
