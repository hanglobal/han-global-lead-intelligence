import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "reli.settings")
django.setup()

from apps.lead_hunter.models import Campaign, CampaignResult
from apps.lead_hunter.pipeline import resume_campaign_pipeline

campaign = Campaign.objects.first()

# Reset crm_synced flag for unqualified leads so they get re-imported
unqualified = CampaignResult.objects.filter(campaign_id=campaign.id, qualification_status='unqualified')
unqualified.update(is_crm_synced=None)

print(f"Resetting sync flag for {unqualified.count()} unqualified leads.")

# Trigger pipeline to import them
resume_campaign_pipeline(campaign)
print("Pipeline triggered to sync unqualified leads.")
