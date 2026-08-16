import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.crm.models import Lead

leads = Lead.objects.all()
print(f"Total Leads: {leads.count()}")
print(f"Unqualified: {leads.filter(status='unqualified').count()}")
print(f"Qualified: {leads.filter(status='qualified').count()}")

print("\nUnqualified breakdown:")
for l in leads.filter(status='unqualified'):
    has_firecrawl = l.enrichments.exists()
    has_insight = hasattr(l, 'insight') and l.insight is not None
    has_drafts = l.email_drafts.exists()
    print(f"Lead {l.lid} | Firecrawl: {has_firecrawl} | Insight: {has_insight} | Drafts: {has_drafts} | stage: {l.stage}")

