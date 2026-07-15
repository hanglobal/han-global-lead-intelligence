import logging
from agents.import_agent import LeadRawSaveAgent
from agents.dedup_agent import LeadDedupAgent

logger = logging.getLogger(__name__)


def sync_campaign_results(campaign, items):
    """Filter duplicates and save unique Apify results to CampaignResult staging table."""
    if not items:
        logger.info(f"sync_campaign_results [{campaign.campaign_id}]: no items to process")
        return {
            'total': 0, 'synced': 0, 'batch_duplicates': 0, 'crm_duplicates': 0,
        }

    # Run Deduplication
    dedup_result = LeadDedupAgent.run(items)
    unique_items = dedup_result['unique_items']
    stats = dedup_result['stats']

    # Save only unique items as CampaignResult
    if unique_items:
        LeadRawSaveAgent.run(unique_items, campaign)
    
    return {
        'total': stats['total'],
        'synced': len(unique_items),
        'batch_duplicates': stats['batch_duplicates'],
        'crm_duplicates': stats['crm_duplicates'],
    }