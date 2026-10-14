import django
import sys
import json
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.crm.models import Lead

campaign_leads = Lead.objects.filter(source_campaign_id=2, status='qualified')

total_qualified = campaign_leads.count()
has_profile = 0
has_posts = 0
both = []

for lead in campaign_leads:
    signals = lead.crm_signals or {}
    
    # Check for profile
    profile = signals.get('linkedin_profile')
    has_prof = bool(profile and isinstance(profile, dict) and len(profile) > 0)
    
    # Check for posts
    posts = signals.get('linkedin_posts')
    has_post = bool(posts and isinstance(posts, list) and len(posts) > 0)
    
    if has_prof:
        has_profile += 1
    if has_post:
        has_posts += 1
        
    if has_prof and has_post:
        both.append(lead.lid)

print(json.dumps({
    "total_qualified": total_qualified,
    "has_profile": has_profile,
    "has_posts": has_posts,
    "has_both": len(both),
    "sample_both_lids": both[:3]
}, indent=2))
