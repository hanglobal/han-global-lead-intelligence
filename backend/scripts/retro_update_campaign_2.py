import os
import django
import logging
import time
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.lead_hunter.models import Campaign, CampaignResult
from apps.crm.models import Lead, CompanyPerson
from services.nexus_client import nexus_client

logger = logging.getLogger(__name__)

def fetch_with_retry(cid, fetch_type="leads"):
    max_retries = 3
    for attempt in range(max_retries):
        res = nexus_client.get_campaign_leads(cid)
        if 'error' in res and '429' in res.get('error', ''):
            # Parse detail string
            wait_time = 10
            if 'details' in res:
                try:
                    details_json = json.loads(res['details'])
                    if 'detail' in details_json:
                        msg = details_json['detail']
                        words = msg.split()
                        for i, w in enumerate(words):
                            if w.isdigit():
                                wait_time = int(w) + 2
                                break
                except Exception:
                    pass
            print(f"Rate limited (429). Sleeping for {wait_time} seconds before retry {attempt+1}/{max_retries}...")
            time.sleep(wait_time)
            continue
        return res
    return {}


c = Campaign.objects.get(id=2)
print(f"Updating Campaign: {c.name} (Nexus ID: {c.nexus_campaign_id})")

# 1. Fetch B2B Data
b2b_cid = c.nexus_campaign_id
b2b_data_dict = {}
if b2b_cid:
    print(f"Fetching B2B leads for Nexus Campaign {b2b_cid}...")
    b2b_res = fetch_with_retry(b2b_cid)
    leads = b2b_res.get('leads', [])
    print(f"Fetched {len(leads)} B2B leads.")
    for item in leads:
        pid = str(item.get('placeId') or item.get('id') or item.get('email') or item.get('company_domain') or '').strip()
        if pid:
            b2b_data_dict[pid] = item

# 2. Iterate CampaignResults
results = CampaignResult.objects.filter(campaign=c)
print(f"Processing {results.count()} CampaignResult records for updates...")

updated_cr_count = 0
updated_cp_count = 0
updated_lead_count = 0

for cr in results:
    raw = cr.raw_data or {}
    updated = False
    
    # 2a. Update B2B data
    if cr.place_id in b2b_data_dict:
        b2b_item = b2b_data_dict[cr.place_id]
        # Merge new B2B fields into raw data
        for k, v in b2b_item.items():
            if k not in raw or not raw[k]:
                raw[k] = v
                updated = True
                
        # Also update the CRM Lead if fields are missing
        lead_obj = Lead.objects.filter(place_id=cr.place_id).first()
        if lead_obj:
            lead_updated = False
            # Some rich firmographic fields
            if not lead_obj.company_annual_revenue and b2b_item.get('company_annual_revenue'):
                lead_obj.company_annual_revenue = b2b_item['company_annual_revenue']
                lead_updated = True
            if not lead_obj.company_total_funding and b2b_item.get('company_total_funding'):
                lead_obj.company_total_funding = b2b_item['company_total_funding']
                lead_updated = True
            if not lead_obj.company_technologies and b2b_item.get('company_technologies'):
                lead_obj.company_technologies = b2b_item['company_technologies']
                lead_updated = True
            if not lead_obj.company_size and b2b_item.get('company_size'):
                lead_obj.company_size = b2b_item['company_size']
                lead_updated = True
            if not lead_obj.industry and b2b_item.get('industry'):
                lead_obj.industry = b2b_item['industry']
                lead_updated = True
                
            if lead_updated:
                lead_obj.save()
                updated_lead_count += 1
                print(f"  -> Updated Firmographics for Lead {lead_obj.lid}")

    # 2b. Update LinkedIn Profile Data
    profile_cid = raw.get('nexus_linkedin_profile_cid')
    profile_data = None
    if profile_cid:
        # Check if already fully populated in raw
        if not raw.get('nexus_linkedin_profile') or not raw.get('nexus_linkedin_profile').get('skills'):
            print(f"Fetching profile for CR {cr.id} (CID: {profile_cid})...")
            profile_res = fetch_with_retry(profile_cid)
            if 'leads' in profile_res and profile_res['leads']:
                profile_data = profile_res['leads'][0]
                raw['nexus_linkedin_profile'] = profile_data
                if cr.ai_clean_data:
                    cr.ai_clean_data['decision_maker_linkedin'] = profile_data
                updated = True
        else:
            profile_data = raw.get('nexus_linkedin_profile')
            
        # Update CompanyPerson
        if profile_data:
            lead_obj = Lead.objects.filter(place_id=cr.place_id).first()
            if lead_obj:
                # Update CompanyPerson fields directly
                cp = CompanyPerson.objects.filter(lead=lead_obj).first()
                if cp:
                    cp_updated = False
                    if not cp.profile_image_url and profile_data.get('profile_image_url'):
                        cp.profile_image_url = profile_data.get('profile_image_url')
                        cp_updated = True
                    if not cp.skills and profile_data.get('skills'):
                        cp.skills = profile_data.get('skills')
                        cp_updated = True
                    if not cp.experience_history and profile_data.get('experience_history'):
                        cp.experience_history = profile_data.get('experience_history')
                        cp_updated = True
                    if not cp.education_history and profile_data.get('education_history'):
                        cp.education_history = profile_data.get('education_history')
                        cp_updated = True
                    if not cp.about and profile_data.get('about'):
                        cp.about = profile_data.get('about')
                        cp_updated = True
                        
                    if cp_updated:
                        cp.save()
                        updated_cp_count += 1
                        print(f"  -> Updated Rich Fields for CompanyPerson: {cp.full_name}")

    # 2c. Update LinkedIn Posts Data
    post_cid = raw.get('nexus_linkedin_post_cid')
    if post_cid:
        if not raw.get('nexus_linkedin_posts'):
            print(f"Fetching posts for CR {cr.id} (CID: {post_cid})...")
            post_res = fetch_with_retry(post_cid)
            if 'leads' in post_res and post_res['leads']:
                post_data = post_res['leads']
                raw['nexus_linkedin_posts'] = post_data
                if cr.ai_clean_data:
                    cr.ai_clean_data['decision_maker_recent_posts'] = post_data
                updated = True

    if updated:
        cr.raw_data = raw
        cr.save(update_fields=['raw_data', 'ai_clean_data'])
        updated_cr_count += 1

print("====================================")
print("Data Recovery & Enhancement Complete")
print(f"CampaignResults updated: {updated_cr_count}")
print(f"Leads updated (Firmographics): {updated_lead_count}")
print(f"CompanyPersons updated (Rich LinkedIn): {updated_cp_count}")
print("====================================")
