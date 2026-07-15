from django.db import connection

tables = [
    'lead_hunter_results',
    'lead_hunter_campaigns',
    'crm_company_people',
    'crm_lead_activities',
    'crm_leads',
    'enrichment_lead_email_draft',
    'enrichment_lead_enrichment',
    'enrichment_lead_insight',
]

with connection.cursor() as cursor:
    for table in tables:
        print(f"Truncating {table} and resetting identity...")
        cursor.execute(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE;')
        
print("Database wiped successfully!")
