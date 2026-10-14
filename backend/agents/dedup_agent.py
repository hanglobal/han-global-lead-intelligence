import logging
from apps.crm.models import Lead

logger = logging.getLogger(__name__)


def _get_item_pid(item):
    if not isinstance(item, dict):
        return ''
    return str(item.get('placeId') or item.get('id') or item.get('email') or item.get('company_domain') or '').strip()


class LeadDedupAgent:
    """Responsible for deduplicating leads within a batch and against existing CRM data.

    Supports both Google Maps (placeId) and Nexus Data Solutions (id / domain / email).
    """

    @staticmethod
    def run(items, place_id_to_result=None, campaign_id=None, is_b2b=False):
        if not items:
            return {
                'unique_items': [],
                'stats': {'total': 0, 'batch_duplicates': 0, 'crm_duplicates': 0},
            }

        seen = {}
        for item in items:
            pid = _get_item_pid(item)
            if not pid:
                continue
            if pid not in seen:
                seen[pid] = item

        from apps.lead_hunter.models import CampaignResult

        if is_b2b:
            # ── B2B Lead Engine (Nexus) ──────────────────────────────────────
            # Clients can run the same B2B campaign repeatedly to source fresh leads.
            # Deduplication only removes intra-batch duplicates (same lead multiple times in one API response).
            # It does NOT reject leads as duplicates against CRM or prior runs so clients can re-run without issues.
            unique_items = list(seen.values())
            stats = {
                'total': len(items),
                'batch_duplicates': len(items) - len(seen),
                'crm_duplicates': 0,
            }

            if place_id_to_result:
                unique_pids = set(_get_item_pid(item) for item in unique_items if _get_item_pid(item))
                unique_cr_ids = [place_id_to_result[pid].id for pid in unique_pids if pid in place_id_to_result]
                if unique_cr_ids:
                    CampaignResult.objects.filter(id__in=unique_cr_ids).update(
                        is_duplicate=False,
                        qualification_status='pending'
                    )

                batch_dup_pids = set(place_id_to_result.keys()) - unique_pids
                batch_dup_ids = [place_id_to_result[pid].id for pid in batch_dup_pids if pid in place_id_to_result]
                if batch_dup_ids:
                    CampaignResult.objects.filter(id__in=batch_dup_ids).update(
                        is_duplicate=True,
                        qualification_status='unqualified'
                    )
        else:
            # ── Non-B2B Legacy Flow (e.g. Google Maps) ──────────────────────
            existing_crm_pids = set(
                Lead.objects.filter(place_id__in=seen.keys()).values_list('place_id', flat=True)
            )
            
            staging_qs = CampaignResult.objects.filter(place_id__in=seen.keys())
            if campaign_id:
                staging_qs = staging_qs.exclude(campaign_id=campaign_id)
            existing_staging_pids = set(staging_qs.values_list('place_id', flat=True))
            
            all_existing_pids = existing_crm_pids | existing_staging_pids
            unique_items = [item for pid, item in seen.items() if pid not in all_existing_pids]

            stats = {
                'total': len(items),
                'batch_duplicates': len(items) - len(seen),
                'crm_duplicates': len(all_existing_pids & seen.keys()),
            }

            if place_id_to_result:
                unique_pids = set(_get_item_pid(item) for item in unique_items if _get_item_pid(item))
                unique_cr_ids = [place_id_to_result[pid].id for pid in unique_pids if pid in place_id_to_result]
                if unique_cr_ids:
                    CampaignResult.objects.filter(id__in=unique_cr_ids).update(is_duplicate=False)
                
                # Scope duplicate marking ONLY to the current batch's results (never historical records)
                duplicate_pids = set(place_id_to_result.keys()) - unique_pids
                duplicate_cr_ids = [place_id_to_result[pid].id for pid in duplicate_pids if pid in place_id_to_result]
                if duplicate_cr_ids:
                    CampaignResult.objects.filter(id__in=duplicate_cr_ids).update(
                        is_duplicate=True,
                        qualification_status='unqualified'
                    )

        logger.info(
            f"DedupAgent [is_b2b={is_b2b}]: {stats['total']} total, "
            f"{stats['batch_duplicates']} batch dupes, "
            f"{stats['crm_duplicates']} CRM dupes, "
            f"{len(unique_items)} unique"
        )

        return {'unique_items': unique_items, 'stats': stats}
