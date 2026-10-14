import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.lead_hunter.models import Campaign, CampaignResult
from apps.crm.models import Lead

c = Campaign.objects.get(id=2)
results = CampaignResult.objects.filter(campaign=c)
updated = 0

for cr in results:
    if not cr.raw_data:
        continue
        
    lead = Lead.objects.filter(place_id=cr.place_id).first()
    if lead:
        dirty = False
        
        # Initialize dictionaries if None
        if lead.raw_data is None: 
            lead.raw_data = {}
            dirty = True
        if lead.crm_signals is None: 
            lead.crm_signals = {}
            dirty = True
            
        # Copy LinkedIn Profile Data
        if 'nexus_linkedin_profile' in cr.raw_data:
            profile_data = cr.raw_data['nexus_linkedin_profile']
            
            # Update raw_data
            if lead.raw_data.get('nexus_linkedin_profile') != profile_data:
                lead.raw_data['nexus_linkedin_profile'] = profile_data
                dirty = True
                
            # Update crm_signals
            if lead.crm_signals.get('linkedin_profile') != profile_data:
                lead.crm_signals['linkedin_profile'] = profile_data
                dirty = True

        # Copy LinkedIn Posts Data
        if 'nexus_linkedin_posts' in cr.raw_data:
            posts_data = cr.raw_data['nexus_linkedin_posts']
            
            # Update raw_data
            if lead.raw_data.get('nexus_linkedin_posts') != posts_data:
                lead.raw_data['nexus_linkedin_posts'] = posts_data
                dirty = True
                
            # Update crm_signals
            if lead.crm_signals.get('linkedin_posts') != posts_data:
                lead.crm_signals['linkedin_posts'] = posts_data
                dirty = True
                
        if dirty:
            lead.save(update_fields=['raw_data', 'crm_signals'])
            updated += 1

print(f"Successfully synced Nexus API data to Lead objects for {updated} leads in Campaign 2.")
