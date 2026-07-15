from apps.lead_hunter.models import Campaign, CampaignResult
from apps.lead_hunter.pipeline import resume_campaign_pipeline

campaign = Campaign.objects.get(id=1)

# Reset processing flags for the failed stages
results = CampaignResult.objects.filter(campaign_id=campaign.id, qualification_status='qualified')
results.update(is_linkedin_processed=None, is_insights_processed=None)

# Resume campaign
campaign.status = 'running'
campaign.save()

resume_campaign_pipeline(campaign)
print(f"Resumed Campaign {campaign.id}. Reset linkedin and insights stages for {results.count()} leads.")
