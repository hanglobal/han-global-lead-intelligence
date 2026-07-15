import logging
from apps.crm.models import Lead

logger = logging.getLogger(__name__)


class LeadDedupAgent:
    """Responsible for deduplicating leads within a batch and against existing CRM data.

    Does one thing: given raw items, return only the unique ones.
    """

    @staticmethod
    def run(items, place_id_to_result=None):
        if not items:
            return {
                'unique_items': [],
                'stats': {'total': 0, 'batch_duplicates': 0, 'crm_duplicates': 0},
            }

        seen = {}
        for item in items:
            pid = item.get('placeId', '')
            if not pid:
                continue
            if pid not in seen:
                seen[pid] = item

        from apps.lead_hunter.models import CampaignResult
        existing_crm_pids = set(
            Lead.objects.filter(place_id__in=seen.keys()).values_list('place_id', flat=True)
        )
        existing_staging_pids = set(
            CampaignResult.objects.filter(place_id__in=seen.keys()).values_list('place_id', flat=True)
        )
        
        all_existing_pids = existing_crm_pids | existing_staging_pids

        unique_items = [item for pid, item in seen.items() if pid not in all_existing_pids]

        stats = {
            'total': len(items),
            'batch_duplicates': len(items) - len(seen),
            'crm_duplicates': len(all_existing_pids & seen.keys()),
        }

        # Update the is_duplicate flag in the database
        if place_id_to_result:
            duplicate_pids = set(pid for pid in place_id_to_result.keys()) - set(item.get('placeId') for item in unique_items if item.get('placeId'))
            unique_pids = set(item.get('placeId') for item in unique_items if item.get('placeId'))
            
            duplicate_cr_ids = [place_id_to_result[pid].id for pid in duplicate_pids if pid in place_id_to_result]
            unique_cr_ids = [place_id_to_result[pid].id for pid in unique_pids if pid in place_id_to_result]
            
            if duplicate_cr_ids:
                CampaignResult.objects.filter(id__in=duplicate_cr_ids).update(is_duplicate=True)
            if unique_cr_ids:
                CampaignResult.objects.filter(id__in=unique_cr_ids).update(is_duplicate=False)

        logger.info(
            f"DedupAgent: {stats['total']} total, "
            f"{stats['batch_duplicates']} batch dupes, "
            f"{stats['crm_duplicates']} CRM dupes, "
            f"{len(unique_items)} unique"
        )

        return {'unique_items': unique_items, 'stats': stats}
