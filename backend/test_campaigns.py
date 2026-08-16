import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.crm.models import Lead
from apps.lead_hunter.models import Campaign

for c in Campaign.objects.all()[:5]:
    print(f"Campaign {c.id} - {c.name}")
    c_leads = Lead.objects.filter(campaign_id=c.id)
    print(f"  Leads by campaign_id={c.id}: {c_leads.count()}")
    s_leads = Lead.objects.filter(source_campaign_id=c.id)
    print(f"  Leads by source_campaign_id={c.id}: {s_leads.count()}")

    print(f"  Sample lead campaign_id: {Lead.objects.first().campaign_id if Lead.objects.exists() else 'N/A'}")
