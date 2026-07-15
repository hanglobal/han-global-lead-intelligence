from apps.lead_hunter.models import Campaign

campaigns = Campaign.objects.all()
updated = 0
for c in campaigns:
    if c.name and c.name != c.name.upper():
        c.name = c.name.upper()
        c.save(update_fields=['name'])
        updated += 1

print(f"Updated {updated} campaigns to uppercase.")
