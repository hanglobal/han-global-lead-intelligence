import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.lead_hunter.models import Campaign, CampaignResult
from apps.enrichment.tasks import process_single_lead_task

try:
    campaign = Campaign.objects.get(campaign_id='CID-5')
except Campaign.DoesNotExist:
    campaign = Campaign.objects.get(id=4)

print(f"Resetting Campaign: {campaign.campaign_id} - {campaign.name}")

# Reset campaign state
campaign.status = 'processing'
campaign.stage = 'processing'
campaign.save(update_fields=['status', 'stage'])

# Get all results for Campaign 4 that have been successfully scraped
results = CampaignResult.objects.filter(campaign=campaign, is_website_scraped=True)
count = 0

for cr in results:
    # Reset processing flags
    cr.is_llm_processed = None
    cr.is_apollo_processed = None
    cr.is_linkedin_processed = None
    cr.is_insights_processed = None
    cr.is_crm_synced = None
    
    # Reset qualification status to give it a fresh chance
    cr.qualification_status = 'qualified'
    
    # Clear old AI data, it will be regenerated
    cr.ai_clean_data = {}
    
    cr.save(update_fields=[
        'is_llm_processed', 'is_apollo_processed', 'is_linkedin_processed',
        'is_insights_processed', 'is_crm_synced', 'qualification_status', 'ai_clean_data'
    ])
    
    # Trigger the task directly skipping Firecrawl
    process_single_lead_task.delay(cr.id)
    count += 1

print(f"Successfully triggered process_single_lead_task for {count} leads.")
