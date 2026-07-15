import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.crm.models import Lead, LeadActivity

# Fix notes
leads = Lead.objects.exclude(notes='')
fixed_notes = 0
for lead in leads:
    if lead.notes == lead.ai_reasoning:
        lead.notes = ''
        lead.save(update_fields=['notes'])
        fixed_notes += 1
print(f"Fixed {fixed_notes} leads with duplicate notes.")

# Fix activities
activities = LeadActivity.objects.filter(activity_type='ai_qualification_passed')
fixed_activities = 0
for activity in activities:
    if activity.description.startswith('Approved by AI:'):
        activity.description = "Lead successfully passed AI qualification."
        activity.save(update_fields=['description'])
        fixed_activities += 1
print(f"Fixed {fixed_activities} ai_qualification_passed activities.")

