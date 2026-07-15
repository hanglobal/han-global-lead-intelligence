import os
import sys
import django

sys.path.append('/home/owais/reli/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.lead_hunter.models import Campaign

active_camps = Campaign.objects.exclude(status__in=['completed', 'failed'])
print(f"Active Campaigns: {active_camps.count()}")
for c in active_camps:
    print(f"Campaign {c.id}: {c.name} - Status: {c.status} - Stage: {c.stage}")
