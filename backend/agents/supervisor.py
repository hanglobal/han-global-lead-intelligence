import logging
from agents.dedup_agent import LeadDedupAgent
from agents.import_agent import LeadRawSaveAgent, LeadImportAgent
from agents.score_agent import LeadScoreAgent

logger = logging.getLogger(__name__)


class ImportSupervisor:
    """Orchestrates the full lead import pipeline.

    Correct order:
      Step 1 — LeadRawSaveAgent  : Save ALL raw items as CampaignResult (full backup)
      Step 2 — LeadDedupAgent    : Remove duplicates (within batch + vs existing CRM leads)
      Step 3 — LeadImportAgent   : Create Lead records for unique items only
      Step 4 — LeadScoreAgent    : Score new leads asynchronously (Celery)

    This means:
      - campaign.results.count()              → total raw items scraped  (e.g. 129)
      - campaign.results.filter(synced=True)  → unique leads created     (e.g. 20)
    """

    @staticmethod
    def run(campaign, items):
        stats = {
            'total': len(items),
            'synced': 0,
            'batch_duplicates': 0,
            'crm_duplicates': 0,
        }

        if not items:
            logger.info(f"Supervisor [{campaign.campaign_id}]: no items to process")
            return stats

        # ── Step 1: Save ALL raw items as CampaignResult ─────────────────────
        place_id_to_result = LeadRawSaveAgent.run(items, campaign)

        # ── Step 2: Dedup ─────────────────────────────────────────────────────
        dedup_result = LeadDedupAgent.run(items, place_id_to_result=place_id_to_result)
        stats['batch_duplicates'] = dedup_result['stats']['batch_duplicates']
        stats['crm_duplicates']   = dedup_result['stats']['crm_duplicates']

        unique_items = dedup_result['unique_items']

        if not unique_items:
            logger.info(
                f"Supervisor [{campaign.campaign_id}]: "
                f"0 new leads after dedup "
                f"(batch_dupes={stats['batch_duplicates']}, "
                f"crm_dupes={stats['crm_duplicates']})"
            )
            return stats

        # ── Step 3: Create Lead records for unique items only ─────────────────
        import_result = LeadImportAgent.run(
            unique_items, campaign, place_id_to_result=place_id_to_result
        )
        stats['synced'] = import_result['synced']

        # ── Step 4: Score new leads async ─────────────────────────────────────
        if import_result['synced'] > 0:
            LeadScoreAgent.run_async()
            logger.info(
                f"Supervisor [{campaign.campaign_id}]: "
                f"raw={stats['total']} "
                f"batch_dupes={stats['batch_duplicates']} "
                f"crm_dupes={stats['crm_duplicates']} "
                f"synced={stats['synced']} — scoring started"
            )

        return stats
