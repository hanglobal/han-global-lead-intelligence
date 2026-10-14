import django
import os
import time
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.lead_hunter.models import CampaignResult
from services.nexus_client import nexus_client

targets = ["marysawyer", "fred-wilson-0972147", "doug-arthur-b449b09", "don-moser-bb334a16", "globalcre"]

for t in targets:
    qs = CampaignResult.objects.filter(campaign_id=2, raw_data__icontains=t)
    if qs.exists():
        cr = qs.first()
        posts_cid = cr.raw_data.get("nexus_linkedin_post_cid")
        if posts_cid:
            print(f"Checking {t} -> {posts_cid}")
            st = nexus_client.get_campaign_status(posts_cid)
            status = st.get("status", "").upper()
            if status == "COMPLETED":
                res = nexus_client.get_campaign_leads(posts_cid)
                if "error" in res:
                    print(f"  Rate Limit or Error: {res.get('details')}")
                leads = res.get("leads", [])
                print(f"  Status: {status}, Posts found: {len(leads)}")
                if leads:
                    raw = cr.raw_data or {}
                    raw["nexus_linkedin_posts"] = leads
                    cr.raw_data = raw
                    cr.save(update_fields=["raw_data"])
            else:
                print(f"  Status: {status}, Error: {st.get('error_message')}")
        else:
            print(f"No post CID for {t}")
        time.sleep(2)
