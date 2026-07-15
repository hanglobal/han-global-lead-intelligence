from django.db import connection
from apps.lead_hunter.models import Campaign, CampaignResult
from apps.crm.models import Lead, LeadActivity, CompanyPerson

tables = [
    CampaignResult._meta.db_table,
    Campaign._meta.db_table,
    CompanyPerson._meta.db_table,
    LeadActivity._meta.db_table,
    Lead._meta.db_table,
]

with connection.cursor() as cursor:
    for table in tables:
        print(f"Truncating {table} and resetting identity...")
        cursor.execute(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE;')
        
print("Database wiped successfully!")
