# Change Log

## 2026-07-13 — Live Campaign Logs & Pipeline Fixes

### Backend — New
- **`lead_hunter/models.py`**: Added `CampaignLog` model to store a persistent trace of events for each campaign.
- **`lead_hunter/views.py`**: Added `CampaignLogsView` API to fetch logs for a campaign. Added `log_campaign_event` utility that saves to DB and publishes `CAMPAIGN_LOG` to Redis.
- **`enrichment/tasks.py`**: Injected human-readable log statements across all pipeline stages (Firecrawl, LLM, Apollo, LinkedIn, AI Insights).

### Frontend — New
- **`CampaignDetails.tsx`**: Implemented a terminal-like "Logs" view. Added a toggle in the 3-dot menu to switch between "Pipeline Stats" and "Logs".
- **`CampaignDetails.tsx`**: Added an SSE listener for `campaign-log` to append live logs in real-time. Auto-scrolls to the latest log.

### Frontend — Fixed
- **`CampaignDetails.tsx`**: Restored the `Promise.all` API fetch in `fetchResults` that gets detailed campaign pipeline stats (`crawled_count`, `llm_processed_count`, etc.) which were accidentally showing as 0.
- **`CampaignDetails.tsx`**: Added a back arrow button in the header that only appears in the Logs view to navigate back to the Details view.

---

## 2026-06-04 — Schema Restoration, Pipeline Audit & Code Cleanup

### Database
- **Full schema restoration** after destructive migration wipe (migration 0014 crm, 0008 lead_hunter, 0002 enrichment)
- All 82 fields re-implemented across `Lead`, `LeadActivity`, `CompanyPerson`, `Campaign`, `CampaignResult`, `LeadEmailDraft`
- **`LeadEnrichment` model re-added** to `enrichment` app with `web_scrape_raw` JSONField and `scraper_run_id` for Firecrawl integration
- **Sequential IDs**: `Lead.lid` now generates `LID-N` (count-based, not UUID), `Campaign.campaign_id` now generates `CID-N`. All existing records backfilled in sequential creation order.

### Backend — New
- **`_serialize_lead(l)` helper** added to `crm/views.py` — single source of truth for Lead serialization (replaces duplicated dicts in `LeadListCreateView` and `LeadDetailView`)
- **`services/firecrawl_client.py`**: `crawl_website()` now accepts `include_paths` kwarg and passes it to the Firecrawl v2 SDK correctly
- **`test_firecrawl.py`**: Full rewrite — auto-loads `.env`, crawls targeted pages (home/about/contact/team/testimonials via regex), saves full `.md` report to backend root, saves raw JSON to `LeadEnrichment` DB record via Django ORM

### Backend — Fixed
- **`crm/views.py` `CRMStatsView`**: Replaced 8 separate `filter().count()` queries with a single `values('status').annotate(Count('status'))` aggregated query
- **`lead_hunter/views.py` `_process_results`**: Removed stale inner `from .apify_service import fetch_apify_results` (already imported at top of file), used `update_fields=['status', 'total_leads_found']`
- **`lead_hunter/views.py` `CampaignListCreateView`**: Added `total_leads_found` to campaign list API response
- **`crm/models.py`**: Removed top-level `import uuid` (moved into legacy `_make_lid()` body to avoid NameError in migrations)
- **`lead_hunter/models.py`**: Same — `import uuid` moved into `_make_campaign_id()` body

### Backend — Removed / Cleaned
- `DashboardStats.tsx` and `RecentActivity.tsx` deleted (never imported anywhere, RecentActivity had hardcoded fake data)

### Frontend — New
- **`CampaignDetails.tsx`**: Added `total_leads_found` to Campaign interface and stats grid ("Scraped", "Synced to CRM", "Leads Found")
- **`CampaignList.tsx`**: Added `total_leads_found` to interface; updated list item to show Name / CID (monospace) / Created date / Status badge only
- **`CampaignDetails.tsx`**: Added `CampaignResult` interface with full fields (name, address, phone, category, rating, review_count)

### Frontend — Fixed
- **`app/page.tsx`**: Removed duplicate `Lead` interface, stale `email` field (was renamed to `company_email`), and redundant leads API fetch (DashboardPanel fetches its own data)
- **`DashboardPanel.tsx`**: Now self-contained — fetches its own leads internally, no longer requires `leads` prop from parent
- **`LeadView.tsx`** and **`DashboardPanel.tsx`**: All `email` references updated to `company_email`

### Frontend — Removed
- Results table removed from `CampaignDetails.tsx` (was added then removed per user request)
- Niche/location subtitle removed from `CampaignList.tsx` items

---

## 2026-05-25 — Phase 3: Campaign API + Multi-Actor Apify Integration

### Backend — New
- **`services/apify.py`**: New `ApifyClient` class per plan spec.
  - `run_actor(actor_type, location, niche, max_leads, webhook_url)` → returns `run_id`
  - `get_run_status(run_id)` → returns status dict
  - `get_run_results(run_id)` → returns raw lead list
  - Actor IDs resolved from env (`APIFY_ACTOR_GMAP`, `APIFY_ACTOR_WEB_SCRAPER`, `APIFY_ACTOR_LINKEDIN`)
  - Module-level singleton `apify` for easy import
- **`apps/lead_hunter/tasks.py`**: New `poll_apify_run` Celery task.
  - Polls Apify every 30s (up to 30 min) as webhook fallback
  - Exits immediately if webhook already completed the campaign
  - Updates `total_leads_found` and fires SSE event on completion
  - Marks campaign `failed` on ABORTED/TIMED-OUT

### Backend — Updated
- **`apps/lead_hunter/apify_service.py`**: Refactored to delegate to `services/apify.py`. Function signatures preserved.
- **`apps/lead_hunter/views.py`**: `RunCampaignView` kicks off `poll_apify_run.apply_async` after starting run
- **`apps/crm/agents/supervisor.py` & `import_agent.py`**: Pipeline redesigned: Raw Save → Dedup → Import → Score

---

## 2026-04-27 — UI Overhaul & Dark Theme Implementation

### UI/UX Changes
- Dark Theme across entire application
- Sidebar Navigation (collapsible)
- CRM Page: Leads table, filter bar, search, import/export, status badges
- Lead Hunter Page: Campaign list, campaign detail, create/edit modals, SSE real-time updates
- Real-time SSE: Redis pub/sub → EventSource → custom browser events

---

## 2026-04-27 — Initial Setup

### Added
- Django backend project structure
- Next.js frontend project structure
- PostgreSQL database configuration
- Lead Hunter app (campaigns and results)
- CRM app (leads and activities)
- REST API endpoints

---

## Upcoming

| Phase | What |
|---|---|
| 5 | Enrichment layer — Firecrawl web crawler integration, `enrich_lead` tasks, CRM signal detection |
| 6 | AI insights + email draft — Ollama primary, Claude fallback |
| 7 | Full CRM API (score_label filter, soft delete, pagination) |
| 8 | Frontend: tabbed lead modal, actor type selector, pagination |
| 9 | Celery Beat scheduler, JSON logging, health check endpoint |
| 10 | Docker Compose, production deployment prep |
