import logging
from agents.import_agent import LeadRawSaveAgent
from agents.dedup_agent import LeadDedupAgent

logger = logging.getLogger(__name__)


def sync_campaign_results(campaign, items):
    """Filter duplicates and save unique results to CampaignResult staging table."""
    if not items:
        logger.info(f"sync_campaign_results [{campaign.campaign_id}]: no items to process")
        return {
            'total': 0, 'synced': 0, 'batch_duplicates': 0, 'crm_duplicates': 0,
        }

    # Step 1: Save ALL raw leads to CampaignResult staging table first
    place_id_to_result = LeadRawSaveAgent.run(items, campaign)

    # Step 2: Run Deduplication against CRM and prior campaigns
    is_b2b = bool(campaign.actor_type == 'nexus' or not campaign.actor_type)
    dedup_result = LeadDedupAgent.run(
        items,
        place_id_to_result=place_id_to_result,
        campaign_id=campaign.id,
        is_b2b=is_b2b
    )
    unique_items = dedup_result['unique_items']
    stats = dedup_result['stats']

    return {
        'total': stats['total'],
        'synced': len(unique_items),
        'batch_duplicates': stats['batch_duplicates'],
        'crm_duplicates': stats['crm_duplicates'],
    }