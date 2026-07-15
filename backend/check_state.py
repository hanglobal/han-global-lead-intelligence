from apps.lead_hunter.models import CampaignResult
results = CampaignResult.objects.filter(campaign_id=1, qualification_status='qualified')
for r in results:
    if r.raw_data:
        print(f"ID {r.id}: linkedin_profiles key exists: {'linkedin_profiles' in r.raw_data}")
