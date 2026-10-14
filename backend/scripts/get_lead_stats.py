import os
import django
import sys
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.crm.models import Lead

campaign_leads = Lead.objects.filter(source_campaign_id=2, status='qualified')
total_qualified = campaign_leads.count()

has_profile = 0
has_posts = 0
both = []

for lead in campaign_leads:
    signals = lead.crm_signals or {}
    
    prof = signals.get('linkedin_profile')
    prof_ok = bool(prof and isinstance(prof, dict) and len(prof) > 0)
    
    posts = signals.get('linkedin_posts')
    posts_ok = bool(posts and isinstance(posts, list) and len(posts) > 0)
    
    if prof_ok:
        has_profile += 1
    if posts_ok:
        has_posts += 1
    if prof_ok and posts_ok:
        both.append(lead.lid)

print(json.dumps({
    "total_qualified": total_qualified,
    "has_profile": has_profile,
    "has_posts": has_posts,
    "has_both": len(both),
    "sample_both_lids": both[:3]
}, indent=2))
