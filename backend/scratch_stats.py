import sys
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.lead_hunter.models import Campaign, CampaignResult

for cid in ['CID-4', 'CID-5', '4', '5']:
    try:
        if cid.startswith('CID-'):
            campaign = Campaign.objects.get(campaign_id=cid)
        else:
            campaign = Campaign.objects.get(id=int(cid))
    except Campaign.DoesNotExist:
        continue

    print(f"\n=====================================")
    print(f"Stats for Campaign ID: {campaign.campaign_id} (DB ID: {campaign.id}) - Name: {campaign.name}")
    print(f"=====================================")
            
    results = CampaignResult.objects.filter(campaign=campaign)
    
    total = results.count()
    print(f"Total Leads: {total}")
    print(f"Campaign Status: {campaign.status}")
    print(f"Campaign Stage: {campaign.stage}")
    
    basic_qualified = results.filter(is_basic_qualified=True).count()
    basic_unqualified = results.filter(is_basic_qualified=False).count()
    
    print(f"Basic Qualified: {basic_qualified}")
    print(f"Basic Unqualified: {basic_unqualified}")
    
    unqualified = results.filter(qualification_status='unqualified')
    print(f"\nUnqualified Leads Total: {unqualified.count()}")
    
    # Reasons for unqualification
    reasons = {}
    for r in unqualified:
        if r.is_basic_qualified == False:
            reason = "Failed Basic Qualification (Settings: Min Reviews, Rating, Website/Phone required)"
        else:
            ai_data = r.ai_clean_data or {}
            reason = ai_data.get("qualification_reasoning", "Rejected at later stage (Firecrawl/Apollo failed) but reason not logged in AI data")
        reasons[reason] = reasons.get(reason, 0) + 1
        
    print("Unqualification Reasons:")
    for reason, count in reasons.items():
        print(f" - {count} leads: {reason}")
        
    print("\nDetailed Processing Stats (for those that passed basic):")
    print(f" Website Scraped: {results.filter(is_website_scraped=True).count()}")
    print(f" Website Scraped Failed: {results.filter(is_website_scraped=False).count()}")
    print(f" LLM Processed: {results.filter(is_llm_processed=True).count()}")
    print(f" LLM Rejected/Failed: {results.filter(is_llm_processed=False).count()}")
    print(f" Apollo Processed: {results.filter(is_apollo_processed=True).count()}")
    print(f" Apollo Rejected/Failed: {results.filter(is_apollo_processed=False).count()}")
    print(f" LinkedIn Processed: {results.filter(is_linkedin_processed=True).count()}")
    print(f" Insights Generated: {results.filter(is_insights_processed=True).count()}")
    print(f" Fully Synced to CRM: {results.filter(is_crm_synced=True).count()}")
