import os
import sys
import django

sys.path.append('/home/owais/reli/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.lead_hunter.models import Campaign, CampaignResult
from apps.crm.models import Lead

camp = Campaign.objects.get(id=12)
print(f"Campaign 12: {camp.keyword} - {camp.location} - Stage: {camp.stage}")

results = CampaignResult.objects.filter(campaign=camp)
print(f"\nTotal Campaign Results: {results.count()}")

for r in results:
    print(f"\n--- Result: {r.id} | Place: {r.place_id} | Name: {r.name}")
    print(f"Is Scraped: {r.is_website_scraped} | Is LLM: {r.is_llm_processed} | Qual Status: {r.qualification_status}")
    if r.ai_clean_data:
        print(f"AI Is Ideal: {r.ai_clean_data.get('is_ideal_customer')} | Reason: {r.ai_clean_data.get('qualification_reasoning')}")
    else:
        print("AI Data: None")
        
leads = Lead.objects.filter(campaign_id=camp.campaign_id)
print(f"\nTotal Leads in CRM for Campaign 12: {leads.count()}")
for l in leads:
    print(f"Lead: {l.name} | Status: {l.status} | Stage: {l.stage} | AI Reason: {l.ai_reasoning}")

