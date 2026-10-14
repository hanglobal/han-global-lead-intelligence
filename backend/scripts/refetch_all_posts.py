import django
import os
import time
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.lead_hunter.models import CampaignResult
from services.nexus_client import nexus_client

qs = CampaignResult.objects.filter(campaign_id=2, qualification_status="qualified", is_linkedin_processed=True)

posts_found_count = 0
total_checked = 0
errors = 0

print(f"Fetching latest posts data from Nexus API for {qs.count()} leads...")

for cr in qs:
    raw = cr.raw_data or {}
    posts_cid = raw.get("nexus_linkedin_post_cid")
    
    if posts_cid:
        total_checked += 1
        try:
            st = nexus_client.get_campaign_status(posts_cid)
            status = st.get("status", "").upper()
            
            if status == "COMPLETED":
                res = nexus_client.get_campaign_leads(posts_cid)
                if "error" in res:
                    print(f"[{cr.id}] Error fetching leads: {res.get('details')}")
                    errors += 1
                    continue

                leads = res.get("posts") or res.get("leads", [])
                if leads:
                    posts_found_count += 1
                    raw["nexus_linkedin_posts"] = leads
                    
                    ai_data = cr.ai_clean_data or {}
                    ai_data["decision_maker_recent_posts"] = leads
                    
                    cr.raw_data = raw
                    cr.ai_clean_data = ai_data
                    cr.save(update_fields=["raw_data", "ai_clean_data"])
                    print(f"[{cr.name}] Found {len(leads)} posts")
                else:
                    print(f"[{cr.name}] No posts")
            else:
                print(f"[{cr.name}] Status: {status}")
        except Exception as e:
            print(f"[{cr.name}] Exception: {e}")
            errors += 1

print("--- RE-FETCH COMPLETE ---")
print(f"Total checked: {total_checked}")
print(f"Errors: {errors}")
print(f"Leads updated with posts: {posts_found_count}")
