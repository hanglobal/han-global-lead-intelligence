# Han Global Lead Intelligence — Project Progress (`project_progress.md`)

## 1. Progress Summary & Status Matrix

| Phase / Module | Description | Status |
|---|---|---|
| **Phase 1: Backend Scaffold & Core Infrastructure** | Django, PostgreSQL, Celery, Redis setup and project scaffolding | ✅ Completed |
| **Phase 2: Database Models & Relational Schema** | Core database tables for campaigns, leads, enrichment, and drafts | ✅ Completed |
| **Phase 3: Lead Hunter & Sourcing Engines** | Nexus Data Solutions API Client, Campaign creation, Celery polling | ✅ Completed |
| **Phase 4: Multi-Agent Ingestion Pipeline** | 4-agent workflow for raw backup, deduplication, import, and scoring | ✅ Completed |
| **Phase 4.5: Sequential IDs & Schema Stabilization** | Standardized `CID-N` and `LID-N` sequential identifiers & audit restoration | ✅ Completed |
| **Phase 5: Firecrawl Website Deep Crawling** | Automated crawling of prospect websites with global concurrency locks | ✅ Completed |
| **Phase 6: AI Engine & Intelligence Suite** | LLM consolidation, strategic insights generation, and cold email drafting | ✅ Completed |
| **Phase 7: Decision-Maker Intelligence Enrichment** | Decision-maker profile enrichment and intelligence consolidation | ✅ Completed |
| **Phase 8: Real-Time SSE & Live Terminal Logs** | Redis pub/sub streaming and terminal-like logs view in campaign details | ✅ Completed |
| **Phase 9: Next.js Frontend & CRM UI** | Modern dark-themed dashboard, campaign details, lead modal, and filters | ✅ Completed |
| **Phase 10: Task Isolation & Option 1 Pipeline** | Streamlined Option 1 lead-by-lead async pipeline and limbo state fixes | ✅ Completed |
| **Phase 11: Dynamic B2B Qualification Settings** | Database-backed UI configuration for Website, Decision Maker, Direct Contacts, ICP | ✅ Completed |
| **Phase 12: Nexus Data Solutions Ingestion** | Nexus B2B Provider integration, filters, campaign status polling, and lead ingestion | ✅ Completed |
| **Phase 13: Financial & Operational Analytics** | Real-time Nexus prepaid balance widget, campaign spend table, and billing analytics | ✅ Completed |
| **Phase 14: Sales Action Center Dashboard** | Top-layer action blocks, priority queue, follow-up scheduler, and outreach logger | ✅ Completed |
| **Phase 15: Celery Beat Scheduler & Automation** | Automated periodic polling, Celery Beat daemonization in startup scripts | ✅ Completed |
| **Phase 16: Security & Performance Hardening** | Bug fixes (model setters, CRM search, safe defaults), SSE auth protection, 57% payload reduction | ✅ Completed |
| **Phase 17: Strict Solo-Admin Architecture** | Purged multi-user roles/teams, single administrator model enforced across backend and UI | ✅ Completed |
| **Phase 18: Phase 1 Client Sales Action Layer** | Exact 4 client buckets (Send Today, Follow Up, Meetings, Needs Research), dynamic Why Now brief | ✅ Completed |
| **Phase 19: Minimal Monochromatic Design System** | Stripped rainbow gradients and loud pills; implemented ultra-premium dark zinc Linear/Vercel styling | ✅ Completed |
| **Phase 20: Nexus LinkedIn Profile & Posts Enrichment** | Integrated Nexus `LINKEDIN` ($6/1k) & `LINKEDIN_POST` ($3/1k) services, non-blocking Celery polling, hyper-personalized AI SDR prompts, and CRM activity/UI display | ✅ Completed |
| **Phase 21: CRM Lead View Sequential Accordion Reorganization & Enterprise UI Polish** | Re-architected Lead View modal into 5 sequential collapsible dropdown sections, eliminated strict card boundaries, removed redundant header strip, and replaced all emojis with enterprise SVG icons | ✅ Completed |
| **Phase 22: Smart LinkedIn Scraping Deduplication & Cache Reuse Engine** | Multi-layer deduplication cache (`LinkedInProfileCache`, `CampaignResult`, `Lead`), URL normalization, in-flight race protection, Nexus double-charge prevention, and hit counter analytics | ✅ Completed |
| **Phase 23: Production Pipeline Hardening & Self-Healing Sweeper** | Resolved 8 critical failure modes, added run_id pre-flight check, transient download backoff, loop continuation for empty websites, atomic row-level locking (`select_for_update`), and 4-case dead-letter sweeper | ✅ Completed |
| **Phase 24: Hardcoded Minimum Lead Limit (250 Leads Minimum Enforcement)** | Enforced strict 250 lead minimum on frontend modal (auto-snapping, warning) and backend views (`lead_count = max(250, ...)`), with client-selectable higher maximums | ✅ Completed |
| **Phase 25: 3-Tier AI Resilience Engine & 2x Concurrency Throughput Boost** | Built 3-tier AI fallback cascade (`glm-5.3:cloud` -> `minimax-m3:cloud` -> Claude 3.5 Sonnet) with regex JSON parser, scaled Celery worker concurrency to 2, and optimized Firecrawl buffer to 8s | ✅ Completed |
| **Phase 26: Comprehensive Security Audit & Workflow Hardening** | Hardcoded credential eradication, BasicAuthMiddleware fail-closed, client-side token generation, Daphne ASGI production deployment, and recursive scoring limiter | ✅ Completed |
| **Phase 27: Comprehensive Multi-Agent Pipeline & Security Stabilization** | Priority fixes P0-P2: SSE JWT authentication, CampaignResult duplicate preservation, Firecrawl website toggle, AI scoring firmographic enrichment, multi-tab session fix, and CRM status validation | ✅ Completed |
| **Phase 28: B2B Repeat Run Support, Dedicated B2B Dedup Policy & Strict LinkedIn Deduplication** | Enforced 250 min B2B leads across models/views/UI, enabled repeating completed campaigns, eliminated duplicate blocking on B2B re-runs while maintaining strict LinkedIn profile caching | ✅ Completed |
| **Phase 29: Rich LinkedIn Data Propagation & Dynamic Frontend Rendering Resilience** | Backfilled rich LinkedIn data, expanded CompanyPerson schema, built resilient frontend JSON mappers, and verified system stability | ✅ Completed |
| **Phase 30: Nexus LinkedIn Post Ingestion, Dual-Key Standardization & Multi-Layer Deduplication Engine** | Resolved Nexus API `'posts'` vs `'leads'` key mismatch, backfilled 83 LinkedIn posts across 22 leads, eliminated raw API duplicates, and fixed React modal hook lifecycle | ✅ Completed |
| **Phase 31: Eastern Timezone (Atlanta, GA) Date Formatting Standardization** | Standardized all system timestamps (`created_at`, `updated_at`, `posted_at`, `registered_at`, `follow_up`) to US Eastern Time with format `"Mon, Jul 13, 2026, 04:47 PM"` | ✅ Completed |
| **Phase 32: Enterprise 0% Data Loss CRM Export Engine (JSON & CSV)** | Comprehensive client export for all CRM fields (firmographics, decision maker, LinkedIn badges/profile, post metrics, AI scores, outreach drafts) with exclusion of raw web dumps | ✅ Completed |
| **Phase 33: Comprehensive System Audit & Priority Stabilization (P0-P3)** | Resolved critical NameError in sales outreach, enabled BasicAuthMiddleware, fixed N+1 query via company_people prefetch, added 500-lead OOM limit, hardened JWT to 60m, scheduled hourly lead scoring, modernized asyncio loops, and organized backend scripts | ✅ Completed |
| **Phase 34: Strict Lead Limits (250–1,000), Security Loopholes & Codebase Audit Hardening** | Enforced 250 min & 1,000 max leads across models/views/UI, atomic run locking, silent JWT refresh, eliminated wildcard CORS, AI prompt injection shielding, purged all dead code, avatar upload size guard, and extracted CRMExportModal | ✅ Completed |

---

## 2. Granular Task Breakdown

### Phase 1: Backend Scaffold & Core Infrastructure
- **Django 4.2 Scaffold Setup**: Initialized clean modular Django architecture with `lead_hunter`, `crm`, `enrichment`, and `users` apps.
- **PostgreSQL Database Integration**: Configured PostgreSQL relational database connection managed through `django-environ`.
- **Celery & Redis Worker Pipeline**: Configured Celery 5 distributed task queue with Redis broker for asynchronous background processing.
- **CORS & Middleware Configuration**: Established secure CORS headers and middleware allowing seamless API communication with Next.js frontend.

### Phase 2: Database Models & Relational Schema
- **Campaign Model (`lead_hunter_campaigns`)**: Defined campaign setup, `actor_type='nexus'`, search filters, lifecycle stages, `billed_amount`, `billed_leads_count`, and status tracking.
- **CampaignResult Model (`lead_hunter_results`)**: Created table for raw scrape backup, stage completion flags, Firecrawl data, and cleaned AI JSON.
- **Lead Model (`crm_leads`)**: Implemented comprehensive lead schema including contact, location, social links, pipeline stage, and scores.
- **Enrichment & Insight Models**: Added `LeadEnrichment`, `LeadInsight`, `LeadEmailDraft`, and `CompanyPerson` tables for deep profile storage.

### Phase 3: Nexus Data Solutions API Client & Sourcing Engine
- **Nexus API Client (`services/nexus_client.py`)**: Built verified HTTP client supporting balance checking (`get_balance()`), dynamic filter retrieval (`get_filters()`), campaign dispatch (`run_campaign()`), status polling (`get_campaign_status()`), and lead download (`get_campaign_leads()`).
- **Celery 15-Second Polling (`poll_nexus_campaign_run`)**: Asynchronously polls Nexus every 15s until `status == 'COMPLETED'`, records billed amount, ingests delivered leads into `CampaignResult`, and triggers Option 1 pipeline.
- **Backend Analytics & Billing Endpoints**: Added `/api/lead-hunter/nexus/balance/`, `/api/lead-hunter/nexus/filters/`, and `/api/lead-hunter/nexus/analytics/`.

### Phase 4: Multi-Agent Ingestion Pipeline
- **LeadRawSaveAgent**: Saves 100% of raw prospect records into `CampaignResult.raw_data` preserving all 28+ Nexus fields.
- **LeadDedupAgent**: Filters duplicate prospects across current batch and CRM database using Nexus IDs, domain, and email.
- **LeadImportAgent**: Synchronizes company `Lead` record and automatically creates/links the primary decision maker `CompanyPerson`.
- **LeadScoreAgent**: Dynamic AI scoring engine (0–100) assigning `hot`, `warm`, or `cold` priority labels based on settings rules.

### Phase 5: Firecrawl Website Deep Crawling
- **Firecrawl SDK Client**: Built `FirecrawlClient` with `include_paths` support to target `/about`, `/contact`, `/team`, and `/services`.
- **Global Concurrency Rate-Limit Lock**: Implemented Redis-based lock adhering strictly to Firecrawl's 10 req/min limit.
- **Graceful Fallback**: Flagged failed crawls with explanatory rejection reasoning while continuing pipeline execution.

### Phase 6: AI Engine & Intelligence Suite
- **LLM Data Consolidation**: Merges prospect profile and Firecrawl website crawl data into standardized structured JSON (`ai_clean_data`).
- **Dynamic AI Qualification**: Evaluates leads against configurable agency ICP criteria, rejecting unviable leads early with detailed reasoning.
- **Strategic Business Insights**: Automatically generates 3 in-depth analytical perspectives (Pain Points, Operational Gap, Opportunity).
- **Custom Cold Email Drafting**: Creates hyper-personalized, concise outreach drafts (<150 words) incorporating specific lead insights.

### Phase 7: Option 1 Multi-Stage Pipeline Execution
- **Streamlined Workflow**: `Nexus Ingestion -> Firecrawl Scrape -> LLM Qualification -> AI Insights & Cold Email -> CRM Sync`.
- **Resource-Saving Early Rejection**: Unqualified leads skip downstream AI analysis and sync directly to CRM as `unqualified`.
- **Decision-Maker Intelligence**: Direct analysis and verification of decision-maker profile and contacts provided by Nexus.

### Phase 8: Real-Time SSE & Live Terminal Logs
- **CampaignLog Model & Audit Logger**: Created `CampaignLog` model and `log_campaign_event` utility to record granular system events.
- **Redis SSE Event Streaming**: Built `/api/lead-hunter/stream/` endpoint streaming live status updates and logs via Server-Sent Events.
- **Terminal Logs View in UI**: Added interactive live terminal viewer inside `CampaignDetails.tsx` with auto-scroll and live log streaming.

### Phase 9: Dynamic B2B Qualification Settings Panel
- **Settings Singleton Model (`LeadQualificationSettings`)**: Database-backed model for website requirement, decision-maker name requirement, direct contact requirement (email/personal email/mobile), LinkedIn requirement, and ICP prompt.
- **Settings UI (`/settings/`)**: Modern toggle interface allowing instant dynamic tuning of qualification rules without system restarts.

### Phase 10: Financial & Operational Analytics Suite
- **Live Prepaid Balance Widget**: Real-time display of prepaid balance ($45.50 USD) and rate ($15.00/1k leads).
- **Campaign Spend Breakdown Table**: Tracks exact spend per extraction campaign, target vs delivered leads, and date.
- **Financial Analytics Endpoint**: Exposes cost per lead ($0.015) and cost per qualified lead.

### Phase 14: Sales Action Center & CRM Follow-Up Engine
- **Sales Command Center (`/sales`)**: Dedicated cockpit with live KPI metric strip (Overdue Follow-ups, Due Today, Hot Uncontacted Leads, Activity This Week).
- **Urgent Follow-Up Queue**: Real-time queues for Overdue, Due Today, Upcoming, and Completed follow-ups with instant Done, Reschedule, and Log Touch actions.
- **Score-Prioritized SDR Queue**: Uncontacted qualified leads sorted strictly by highest AI lead score first (100 ➔ 0), with decision-maker contacts, AI pitch hook, and 1-click cold email draft preview & copy.
- **CRM Follow-Up & Outreach Modals**: `ScheduleFollowUpModal` (date shortcuts, time, action type, priority, agenda) and `LogOutreachModal` (calls, emails, meetings, outcome tracking, pipeline stage updates).
- **Interactive Notes & Timeline**: Timestamped `LeadNote` model and real-time notes history timeline with multi-note audit trail.

### Phase 15: Celery Beat Scheduler & Automation Daemonization
- **Automated Periodic Task Scheduler**: Configured Celery Beat to run in the background alongside Celery Worker.
- **Service Management Scripting**: Updated `start-all.sh` and `stop-all.sh` with dedicated PID tracking (`celery_beat.pid`) and log streaming (`celery_beat.log`).
- **Periodic Campaign Monitor**: Automatically executes periodic polling tasks for active sourcing jobs without manual invocation.

### Phase 16: Security & Performance Hardening
- **Django Model Property Setters**: Fixed attribute collision bug in `Lead` model property setters (`industry`, `company_annual_revenue_clean`, `company_total_funding_clean`).
- **CRM Search FieldError Resolution**: Fixed search query filter on non-existent `decision_maker` model field in `apps/crm/views.py` by mapping queries across `company_people__first_name`, `company_people__last_name`, `company_people__full_name`, `company_people__email`, and `company_name`.
- **Database Integrity & Safe Defaults**: Added fallback defaults for `place_id` and `fid` during manual lead creation, preventing PostgreSQL NOT NULL crashes.
- **SSE Stream Security**: Protected `/api/lead-hunter/stream/` with BasicAuth/session authentication; unauthorized requests now return 401 Unauthorized.
- **CRM List Payload Optimization**: Optimized `/api/crm/leads/` list query by deferring massive text fields (`company_description`, `address_line_1`, etc.), reducing list response size by **57%** (from 2.7 MB down to 1.1 MB).
- **Django Staticfiles Config**: Set `STATIC_ROOT` and integrated automated `collectstatic` into startup scripts.

### Phase 17: Strict Solo-Admin Architecture
- **Purged Multi-User Redundancy**: Deleted extra user accounts (e.g. `testadmin`); enforced single administrative account (`admin`).
- **Context-Bound Profile & Security**: Refactored `apps/users/views.py` and frontend `/auth-api/update-security/` to bind directly to `request.user`.
- **Solo-Admin UI Adaptation**: Removed multi-tenant role switchers, team permissions, and user lists from `/settings/`, leaving a sleek, focused personal details and security configuration suite.

### Phase 18: Phase 1 Client Sales Action Layer (`/sales`)
- **Client Enhancement Brief Alignment**: Implemented Phase 1 specifications from `docs/Han_Global_Dashboard_Enhancement_Brief_Final.docx`.
- **4 Dedicated Client Action Buckets**:
  1. `send_today` (59 leads): Contact-ready leads with verified decision-maker emails.
  2. `follow_up_today` (0 leads): Overdue and due-today scheduled touches.
  3. `meetings` (2 leads): Booked discovery demos, proposals sent, in-flight deals.
  4. `needs_research` (6 leads): High-fit companies missing direct email or decision maker.
- **Dynamic "Why Now" Sales Brief Synthesis**: Generates customized 1-2 sentence sales context and recommended service during lead serialization based on company scale, employee count, and detected operational pain points.
- **SDR Lifecycle Actions**: Implemented `/leads/{id}/schedule-followup/`, `/leads/{id}/complete-followup/`, and `/leads/{id}/log-outreach/`.
- **Collapsible Operational Health Drawer**: Added live database metric strip for pipeline opportunities and touch volumes.

### Phase 19: Ultra-Premium Minimal Monochromatic Aesthetic Refactoring
- **Monochromatic Restraint Standard**: Eliminated multi-colored card fills (emerald, amber, indigo, purple) in favor of sleek matte dark zinc cards (`bg-zinc-900/40`, `border-zinc-800/80`).
- **Gradient Removal**: Stripped all loud top accent gradients (`from-emerald-500 to-indigo-500`, `from-blue-500`, `from-rose-500 to-orange-500`) from Settings, Dashboard, and Lead Hunter.
- **Monochrome Status & Priority Indicators**: Replaced neon badge overload with subtle monochrome tags, muted micro-dots for scores (Hot/Warm/Cold), and dark zinc pill badges.
- **Clean Action Elements**: Converted bright buttons and toggles to high-contrast white action buttons (`bg-white text-zinc-950`) and dark zinc controls matching Linear, Vercel, and Raycast.

### Phase 20: Nexus LinkedIn People Profile & Posts Enrichment
- **Nexus Client Enhancements (`services/nexus_client.py`)**: Added `scrape_linkedin_profiles()` (calling `LINKEDIN` service at $6.00/1k) and `scrape_linkedin_posts()` (calling `LINKEDIN_POST` service at $3.00/1k). Added `poll_campaign_results()` and `enrich_linkedin_person()` helper methods.
- **Workflow Pipeline Stage 1.5 (`apps/enrichment/tasks.py`)**: Positioned between Stage 1 (LLM ICP Qualification) and Stage 2 (AI Strategic Insights & Cold Email). Only triggers for leads that successfully pass ICP qualification and have a valid personal/company LinkedIn URL. Updates campaign stage to `linkedin_scraping`.
- **Non-Blocking Celery Countdown Retry**: Implemented `@shared_task poll_lead_linkedin_enrichment_task` utilizing Celery `self.retry(countdown=15)` pattern (max 15 retries = ~3.75 min), freeing the Celery worker between polling intervals so concurrency is never blocked.
- **Hyper-Personalized AI SDR Intelligence (`services/ai_client.py`)**: Injected decision-maker LinkedIn headline, professional bio/summary, and recent 3–5 posts into prompt contexts for both `generate_insights()` and `generate_email_draft()`. AI SDR naturally weaves subtle references to their recent posts into bespoke cold emails.
- **Database & CRM Persistence (`agents/import_agent.py` & `apps/crm/views.py`)**: Stores profile details and recent posts in `lead.crm_signals['linkedin_profile']` and `lead.crm_signals['linkedin_posts']`, populates `CompanyPerson.headline`, and logs a `linkedin_enriched` activity in `LeadActivity`. Serialized in CRM with robust 3-tier fallback.
- **Frontend Decision Maker UI (`frontend/src/components/crm/LeadView.tsx`)**: Added "Recent LinkedIn Activity" section in Decision Maker card rendering recent posts text, date, and "View Post ↗" direct link. Rendered LinkedIn bio/about snippet. Validated TypeScript build with 0 errors.

### Phase 21: CRM Lead View Sequential Accordion Reorganization & Enterprise UI Polish
- **Sequential Dropdown Accordion Architecture (`frontend/src/components/crm/LeadView.tsx`)**:
  - Re-architected the entire CRM Lead View modal into a clean, collapsible dropdown accordion system modeled after `FilterTab.tsx`.
  - All 5 sections default to open (`isOpen: true`) for immediate full visibility while allowing independent toggling via high-precision rotating SVG chevron indicators (`rotate-180`).
- **Standardized 5-Section Sequential Order**:
  1. `1. Company & Firmographics`: 4-column metric strip (Headcount, Annual Revenue, Funding, Founded Year), Company Description & Website AI Summary, Tech Stack pill tags, Location specifics (HQ, Street Address, Metro), and Web/Social links (Website, LinkedIn, Twitter/X, Facebook, YouTube, Instagram).
  2. `2. Decision Maker & Direct Contacts`: Executive profile banner (Full Name, Title, Department, Seniority), C-Suite badge, Direct phone/mobile, Primary work email, Personal email, LinkedIn professional bio, and Recent 3–5 LinkedIn posts feed with dates and "View Post ↗" links.
  3. `3. AI ICP Intelligence & Qualification`: AI Qualification status banner (Passed ICP / Excluded), dynamic Pass/Fail verification checklist (Website Active, Decision Maker Identified, Direct Mobile Available, Direct Email Available, Personal Email Available, LinkedIn Verified), 3-card strategic insights (Pain Points, Operational Gap, Strategic Opportunity), and Industry & Market Segment tags.
  4. `4. AI Cold Outreach Pitch`: Target Decision Maker callout, Subject Line with 1-click "Copy Subject" button, Full cold email body, and 1-click "Copy Pitch" & "Open in Mail Client (`mailto:`)" action buttons.
  5. `5. Notes & Activity Timeline`: Quick note input with instant submission, chronological Lead Notes history feed, and comprehensive Lead Activity Audit Trail timeline.
- **Boundary Softening & Structural Polish**:
  - Eliminated strict, nested card boxes and heavy borders in favor of seamless hairline dividers (`border-b border-zinc-800/50`) and subtle `bg-zinc-950/40` backdrops.
  - Eliminated visual clutter and nested containers for a flat, modern, fluid information hierarchy.
- **Header Control Strip Optimization**:
  - Removed the redundant top control bar ("Collapse All" button and section pills) below the lead title, allowing immediate focus on lead details with clean direct accordion controls.
- **Enterprise SVG Icon System**:
  - Replaced 100% of informal emojis (`🏢`, `👤`, `🧠`, `✉️`, `📋`, `📅`, `📞`, `🌐`, `💼`, `📍`, `📘`, `🐦`, `📸`, `▶️`) across the modal with crisp, scalable, professional SVG icons matching Linear and Vercel standards.
- **Full TypeScript Type-Safety**:
  - Zero compilation errors validated via `npx tsc --noEmit`.

### Phase 22: Smart LinkedIn Scraping Deduplication & Cache Reuse Engine
- **Zero Double-Charge Guarantee**: Guarantees that any decision-maker or company whose LinkedIn profile or posts have already been scraped will NEVER be submitted to Nexus Data Solutions again, preventing duplicate balance deductions ($6.00/1k profiles + $3.00/1k posts saved).
- **Dedicated Cache Architecture (`LinkedInProfileCache`)**: Added database-backed model [`LinkedInProfileCache`](file:///var/www/han-global-lead-intelligence/backend/apps/enrichment/models.py) in `apps/enrichment/models.py` with `normalized_url` (indexed, unique), `profile_data`, `posts_data`, `status`, and `hit_count` telemetry. Applied migration `0004_linkedinprofilecache`.
- **Intelligent Canonical URL Normalizer (`normalize_linkedin_url`)**: Strips protocols (`http://`, `https://`, `www.`), query parameters (`?utm_source=...`, `?miniProfileUrn=...`), trailing slashes, and sub-paths (`/overlay/`, `/recent-activity/`) to unify all variants to canonical form (e.g. `linkedin.com/in/doug-arthur-b449b09`).
- **Multi-Layer Deduplication Engine (`apps/enrichment/linkedin_service.py`)**:
  1. *Layer 1*: Checks candidate's own `CampaignResult.raw_data` for already-present data.
  2. *Layer 2*: Performs O(1) indexed lookup in `LinkedInProfileCache` table. If cached, increments `hit_count` and directly copies profile & posts into `cr.raw_data` and `cr.ai_clean_data`.
  3. *Layer 3*: Fallback inspection across historic `CampaignResult` records and CRM `Lead` / `CompanyPerson` entities. Automatically migrates recovered scrapes into `LinkedInProfileCache`.
  4. *In-Flight Protection*: If an active scrape for the same URL is already running on Nexus, newly arriving tasks attach to the existing campaign ID rather than creating a duplicate campaign.
- **Pipeline Integration (`apps/enrichment/tasks.py`)**:
  - In `process_single_lead_task` (Stage 1.5): Bypasses Nexus call entirely when cached data exists, logs a campaign event, and transitions straight to Stage 2 (`generate_insights`).
  - In `poll_lead_linkedin_enrichment_task`: Automatically caches newly completed scrape results for future leads and campaigns.
  - In `services/nexus_client.py`: Added cache check to `enrich_linkedin_person` helper.
- **Django Admin Integration (`apps/enrichment/admin.py`)**: Registered `LinkedInProfileCache` in Django admin with search, list filter, and hit counter visibility.
- **Automated Verification**: Validated 100% test pass on normalization, cache miss, mock scrape caching, URL variation cache hit, and hit counter incrementation.

### Phase 23: Complete Pipeline Deep Audit, Error-Trap Hardening & Idempotency Overhaul
- **8 Critical Pipeline Vulnerabilities Eliminated**:
  1. *Nexus Run ID Validation*: Pre-flight check in `RunCampaignView` prevents ghost campaigns from entering perpetual `running` status when provider returns missing/empty run IDs (returns clean 502 Bad Gateway).
  2. *Nexus Leads Download Transient Retry*: Protected `poll_nexus_campaign_run` against socket timeouts / 502 errors so campaigns never complete with 0 leads due to transient network hiccups.
  3. *Firecrawl Scraping Loop Continuation*: Fixed critical bug in `campaign_scrape_stage_task` where leads without websites aborted the entire scraping loop without scheduling next leads. Preserved `is_website_scraped=None` on rate limits.
  4. *Celery MaxRetries Limbo Trap*: Added terminal failure handling in `process_single_lead_task` and `campaign_scrape_stage_task` to prevent campaigns from remaining stuck in `running` status forever upon reaching Celery max retries.
  5. *4-Case Dead-Letter Sweeper*: Expanded `sweep_stuck_leads` in `apps/crm/tasks.py` with Case 3 (post-scrape/pre-LLM recovery) and Case 4 (stalled completed campaign auto-finalization).
  6. *CRM Ingestion Idempotency*: Guarded `ai_clean_data` against NoneType errors, switched `LeadInsight` and `LeadEmailDraft` to `update_or_create` to eliminate unique constraint `IntegrityError` on task retries.
  7. *Qualification Reasoning Telemetry*: Accumulated exact failure criteria (missing DM, missing contact, missing website) into `qualification_reasoning` so sales reps see reasons in CRM.
  8. *Atomic Completion Concurrency Safety*: Wrapped `check_campaign_completion` in `transaction.atomic()` with PostgreSQL row-level locking (`select_for_update`) to prevent duplicate completion events.
- **Production Artifact**: Documented findings, flow diagrams, and runbooks in `pipeline_deep_audit_and_hardening_report.md`.

### Phase 24: Hardcoded Minimum Lead Limit (250 Leads Minimum Enforcement)
- **Minimum 250 Leads Enforced Across Stack**:
  - **Frontend (`CampaignForm.tsx`)**:
    - Default input value set to `250`.
    - HTML input `min="250"`, `step="50"`.
    - Auto-snapping on `onBlur`: values below 250 or empty automatically snap back to `250`.
    - Real-time indicator message warning the user if a value under 250 is entered.
    - Submit handler enforces `lead_count = Math.max(250, parseInt(leadLimit))`.
  - **Backend (`apps/lead_hunter/views.py`)**:
    - `CampaignView.post`: Enforces `lead_count = max(250, int(raw_lead_count))`.
    - `CampaignDetailView.patch`: Enforces `lead_count = max(250, int(raw_lead_count))`.
    - `RunCampaignView.post`: Enforces `fetch_count = max(250, int(campaign.lead_count or 250))` sent to Nexus API.
  - **Database Schema (`Campaign.lead_count`)**: Set default value to `250` in `apps/lead_hunter/models.py`.
  - **UI Labels & Fallbacks**: Updated `CampaignDetails.tsx` requested leads fallback to `250`.
- **Validation**: 100% verified via Python shell, Django system checks (`0 issues`), and TypeScript compile (`npx tsc --noEmit` exited 0).

### Phase 25: 3-Tier AI Resilience Engine & 2x Concurrency Throughput Boost
- **3-Tier AI Fallback Chain (`services/ai_client.py`)**:
  - **Tier 1 (Primary)**: `glm-5.3:cloud` via Ollama Cloud API (`https://ollama.com/api/generate`).
  - **Tier 2 (Secondary Backup)**: `minimax-m3:cloud` via Ollama Cloud API.
  - **Tier 3 (Final Failover)**: Anthropic Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`).
  - Added robust regex-assisted JSON parsing (`_parse_json`) to safely parse model responses containing thinking tokens, markdown code blocks, or explanatory preambles.
- **Concurrency & Speed Optimization**:
  - Scaled Celery worker to `--concurrency=2` (spawning dual ForkPoolWorkers) across `start-all.sh` and runtime daemons.
  - Reduced `FIRECRAWL_RATE_LIMIT_SECONDS` from 65s to 8s (well within Firecrawl's 10 req/min allowance), boosting pipeline scraping throughput by ~800%.
- **Live Verification**:
  - Live tested `glm-5.3:cloud` generating full strategic B2B insights with pain points, operational gaps, and opportunities.
  - Live tested deliberate Tier 1 failure simulating fallback to `minimax-m3:cloud` (validated 100% successful response parsing).

### Phase 26: Comprehensive Security Audit & Workflow Hardening
- **Critical Security Remediation**:
  - **Removed Hardcoded Passwords**: `create_users.py` now fails closed if `DJANGO_SUPERUSER_PASSWORD` or `BASIC_AUTH_PASSWORD` are not explicitly defined in the environment.
  - **Enforced `BASIC_AUTH_PASSWORD`**: Populated `.env` with strong credentials, eliminating the empty password bypass vulnerability in the middleware.
  - **Activated `BasicAuthMiddleware`**: Rewrote the middleware to fail closed (returning `503 Service Unavailable` if unconfigured), explicitly bypass exempt paths (`/admin/`, `/static/`, `OPTIONS`), and successfully added it to Django's `MIDDLEWARE` chain.
- **High & Medium Security Hardening**:
  - **Client-Side Auth Token Generation**: Password update flows now instruct the Next.js frontend to generate the session token client-side, preventing raw credentials from leaking via backend HTTP response bodies.
  - **Explicit CORS on SSE Endpoint**: Removed wildcard `Access-Control-Allow-Origin: *` from `RealtimeStreamView`, enforcing strictly whitelisted origins from settings.
  - **Production Daphne ASGI Web Server**: Replaced development `manage.py runserver` with a production-grade `daphne` deployment. Both backend (`daphne`) and frontend (`next start/dev`) are now strictly bound to `127.0.0.1` rather than `0.0.0.0` to ensure internal services cannot be accessed directly via the server's public IP.
  - **Production Security Headers**: Enforced `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, and `SECURE_CONTENT_TYPE_NOSNIFF` when `DEBUG=False`.
  - **Secret Key Validation**: Removed the insecure default fallback for `DJANGO_SECRET_KEY` when `DEBUG=True`.
- **Workflow & Logic Corrections**:
  - **Recursive Scoring Depth Limiter**: Engineered a circuit breaker in `score_pending_leads` to cap recursion depth at 50 iterations (5000 leads) and detect zero-progress failures, preventing infinite loop Celery deadlocks.
  - **Pipeline Stage Validation**: Added the missing `'processing'` choice to `Campaign.STAGE_CHOICES` for database consistency.
  - **Optimized Outreach Save**: Consolidated a redundant double `lead.save()` in `LeadLogOutreachView` into a single atomic transaction.
- **Dead Code Eradication**:
  - Removed broken/no-op `SetPrimaryPersonView`.
  - Eliminated conflicting duplicate `/notes/` endpoint (retaining canonical `/lead-notes/`).
  - Purged scratch test scripts (`scratch_stats.py`, `test_campaigns.py`, `test_leads.py`, `restart_c4.py`) and residual Redis dumps (`dump.rdb`) from the project root.
  - Removed duplicate URL alias `analytics/nexus/`.

### Phase 27: Comprehensive Multi-Agent Pipeline & Security Stabilization (2026-10-03)
- **P0-1: RealtimeStreamView SSE Authentication Fix (`backend/apps/lead_hunter/views.py`)**:
  - Added `JWTAuthentication` alongside `BasicAuthentication` and `SessionAuthentication` in `RealtimeStreamView`.
  - Resolved 401 Unauthorized / 502 Bad Gateway loops when the Next.js frontend connects to the event stream using Bearer JWT tokens.
- **P0-2: Security Update Admin Session Lockout Fix (`backend/apps/users/views.py`, `frontend/src/app/auth-api/update-security/route.ts`)**:
  - Updated `update_security` endpoint to generate and return fresh JWT tokens (`access` and `refresh`) after password updates.
  - Fixed Next.js route handler to set `reli_session_token` cookie directly to `data.access`, eliminating the broken `btoa()`/`atob()` Basic Auth cookie overwrite that caused immediate admin logouts.
- **P0-3: Campaign Staging Deduplication Preservation (`backend/apps/lead_hunter/services.py`, `backend/agents/dedup_agent.py`)**:
  - Re-ordered `sync_campaign_results` to call `LeadRawSaveAgent.run(items, campaign)` first, ensuring 100% of raw prospect records are persisted to `CampaignResult`.
  - Updated `LeadDedupAgent` to evaluate duplicates across CRM and prior campaigns (excluding current `campaign_id`), marking duplicates with `is_duplicate=True`, `qualification_status='unqualified'`, and clear reasoning rather than silently dropping them.
- **P1-1: False Qualified Lead Prevention (`backend/agents/import_agent.py`)**:
  - Guarded `run_single_from_ai` to verify `cr.qualification_status != 'unqualified'` and `cr.is_basic_qualified is not False` before evaluating ideal customer fit.
  - Ensured leads rejected during basic qualification or deduplication are never falsely promoted to `'qualified'`.
- **P1-2: Firecrawl Website Requirement Toggle (`backend/apps/enrichment/tasks.py`)**:
  - Connected `campaign_scrape_stage_task` to `LeadQualificationSettings.require_website`.
  - If `require_website` is disabled, leads without websites bypass the Firecrawl scrape step and proceed directly to LLM consolidation and CRM ingestion instead of being unconditionally rejected.
- **P1-3: LeadEnrichment Raw Firecrawl Persistence (`backend/agents/import_agent.py`)**:
  - Added automated creation of `LeadEnrichment` records with `web_scrape_raw` when `cr.firecrawl_raw_data` is present.
  - Fixed empty/null web scrape data in CRM lead drawer (`_serialize_lead`).
- **P1-4: AI Lead Scoring Firmographics & Decision Maker Enrichment (`backend/agents/score_agent.py`)**:
  - Enhanced `lead_data` payload passed to `ai_client.calculate_lead_score` to include primary decision-maker contact details (direct email, personal email, mobile phone, LinkedIn) and company firmographics (size, annual revenue, technologies, domain).
  - Ensured leads can earn all possible points defined in dynamic scoring rules (up to 70 points previously missed due to omitted fields).
- **P2-1: User Rate Throttle Limit Adjustment (`backend/config/settings.py`)**:
  - Increased authenticated `user` throttle rate from `100/minute` to `1000/minute` to accommodate intensive SPA workflows, real-time polling, and bulk CRM operations without false 429 errors.
- **P2-2: Multi-Tab Dashboard Session Fix (`frontend/src/app/(dashboard)/layout.tsx`)**:
  - Removed destructive global `/auth-api/logout/` trigger on tab open when `sessionStorage` is empty.
  - Preserved multi-tab workflows by relying on Next.js `middleware.ts` token verification and re-activating `reli_session_active` on layout mount.
- **P2-3: CRM Status Input Validation (`backend/apps/crm/views.py`)**:
  - Added strict validation against `Lead.STATUS_CHOICES` in `LeadStatusUpdateView`, `LeadCompleteFollowUpView`, and `LeadLogOutreachView`, returning clean HTTP 400 Bad Request on invalid inputs.
- **P2-4: Qualification Settings Type Casting Error Handling (`backend/apps/crm/views.py`)**:
  - Wrapped `min_reviews` and `min_rating` parsing in `LeadQualificationSettingsView.patch` with `(ValueError, TypeError)` exception handling returning HTTP 400.
  - Ensured all setting fields are returned in the patch response.
- **Verification**:
  - Django system checks: `0 issues`.
  - Next.js production build: 10/10 routes compiled with 0 TypeScript/lint errors.
  - Realtime SSE stream: verified with valid JWT token.
  - Clean restart: executed via `./stop-all.sh && ./start-all.sh`.

### Phase 28: B2B Repeat Run Support, Dedicated B2B Dedup Policy & Strict LinkedIn Deduplication (2026-10-03)
- **Minimum 250 Lead Limit Enforcement (`models.py`, `views.py`, `CampaignForm.tsx`)**:
  - `backend/apps/lead_hunter/models.py`: Updated `Campaign.save()` to automatically enforce `if not self.lead_count or self.lead_count < 250: self.lead_count = 250` for B2B/Nexus campaigns.
  - `backend/apps/lead_hunter/views.py`: Enforced `lead_count = max(250, ...)` across campaign creation (`CampaignListCreateView`), editing (`CampaignDetailView`), and execution (`RunCampaignView`).
  - `frontend/src/app/(dashboard)/lead-hunter/components/CampaignForm.tsx`: Defaulted `leadLimit` to 250, enforced `min="250"`, automatic onBlur snap, and `Math.max(250, ...)` payload submission.
- **B2B Dedicated Deduplication & Repeat Run Policy (`backend/agents/dedup_agent.py`, `backend/apps/lead_hunter/services.py`)**:
  - Parameterized `LeadDedupAgent.run(items, place_id_to_result, campaign_id, is_b2b)` to distinguish B2B lead sourcing from legacy single-shot scraping.
  - For B2B (`is_b2b=True`):
    - Intra-batch duplicates are cleanly removed so identical records in a single API payload are not processed twice concurrently.
    - CRM and cross-campaign duplicate rejection is disabled for B2B leads—enabling clients to re-run the same campaign or run similar campaigns repeatedly without leads being disqualified as duplicates.
    - Scoped `CampaignResult` status updates strictly to the current batch's records in `place_id_to_result`, completely eliminating destructive overwrites of historical campaign results.
- **Graceful Re-running of Completed B2B Campaigns (`views.py`, `CampaignDetails.tsx`)**:
  - `backend/apps/lead_hunter/views.py`: Updated `RunCampaignView` to check `is_rerun = (request.data.get('action') == 'rerun' or campaign.status == 'completed')`. Completed campaigns now trigger a fresh Nexus sourcing run instead of prematurely short-circuiting to an empty pipeline.
  - `frontend/src/app/(dashboard)/lead-hunter/components/CampaignDetails.tsx`: Added dedicated "Re-run Campaign" button (and dropdown action) visible when a campaign is completed, initiating a re-run with live status updates.
- **Safe Database Upserting & CRM Refresh (`backend/agents/import_agent.py`)**:
  - `LeadRawSaveAgent.run`: Converted raw result insertion to `CampaignResult.objects.update_or_create(campaign=campaign, place_id=pid, defaults={...})`, preventing duplicate result rows on campaign re-runs and resetting pipeline flags for fresh processing.
  - `LeadImportAgent.run_single_from_ai`: Removed premature CRM duplicate rejection. When a lead's `place_id` already exists in CRM, the existing `Lead` record is enriched and refreshed with the latest data, and linked with a `lead_updated` activity event without violating unique constraints or dropping leads.
- **Strict LinkedIn Profile Scraping Deduplication Guarantee (`backend/apps/enrichment/linkedin_service.py`)**:
  - Verified and preserved multi-layer LinkedIn caching (`LinkedInProfileCache`, `CampaignResult`, CRM `Lead`): any profile already processed in prior runs/leads is strictly reused from cache, avoiding duplicate dispatches and saving $0.009 USD Nexus charge per lead.
- **Celery Polling Retry Exception Fix (`backend/apps/lead_hunter/tasks.py`)**:
  - Resolved `AttributeError: 'poll_nexus_campaign_run' object has no attribute 'Retry'` by importing `Retry` and `MaxRetriesExceededError` from `celery.exceptions`.
  - Configured 20-second countdown for non-blocking status polling against Nexus API, ensuring clean rate-limit compliance.
- **Verification & Testing**:
  - Automated unit test suite verified:
    1. Campaign model automatically enforces minimum 250 leads.
    2. B2B deduplication permits re-running and does not reject existing CRM leads.
    3. Non-B2B flows continue to flag CRM duplicates as expected.
    4. LinkedIn profile cache returns completed profiles and blocks duplicate charges.
  - Full TypeScript validation (`npx tsc --noEmit`): 0 errors.
  - Django system check (`python manage.py check`): 0 issues.
  - All services re-started cleanly via `./stop-all.sh && ./start-all.sh`.

### Phase 29: Rich LinkedIn Data Propagation & Dynamic Frontend Rendering Resilience
- **Status Matrix Update**: Added completed integration verification for "System Stability/Verification" and "Frontend Verification" of rich LinkedIn data.
- **Backend Architecture & Schema Extension**:
  - `apps/crm/models.py`: Upgraded `CompanyPerson` to officially support deep rich fields: `about`, `skills` (JSON array), `experience_history` (JSON array), `education_history` (JSON array), and `profile_image_url`.
  - `services/nexus_client.py`: Expanded API integration surface by implementing `list_campaigns` and `retry_campaign` endpoints for better resilience against failing Nexus campaigns.
- **Data Persistence & Backfill Synchronization**:
  - Built custom Python scripts (`retro_update_campaign_2.py`, `sync_retro_to_lead.py`) to safely backfill missing rich data into existing `CampaignResult` records.
  - Successfully bridged historical Campaign Result data natively into CRM `Lead` structures without altering `CompanyPerson` primary ingestion stability. Over 60 leads were successfully updated.
- **Dynamic Frontend Mapping & Resilience (`LeadView.tsx`)**:
  - **Type-Safe Extraction**: Overcame Nexus schema variations where expected keys differed from standard JSON (e.g. nested objects for `skills`, `position` and `companyName` instead of `title` and `company_name`, `schoolName` instead of `school_name`).
  - **Eliminated UI Artifacts**: Fixed `[object Object]` mapping errors in the `Skills` accordion by gracefully stringifying array objects.
  - **Prevented 'Unknown Title' Bugs**: Restructured mapping logic for experience and education history to cleanly coalesce values across standard and nested API outputs.
  - **Posts Feed Validation**: Extracted `content`, `postedAt`, and `postUrl` to flawlessly display raw posts data when available.

### Phase 30: Nexus LinkedIn Post Ingestion, Dual-Key Standardization & Multi-Layer Deduplication Engine (2026-10-11)
- **Nexus API Service Key Discrepancy Discovery & Client Standardization (`services/nexus_client.py`)**:
  - Uncovered critical discrepancy: Nexus Data Solutions returns records under the key `"leads"` for `B2B` & `LINKEDIN` profile scraping, but returns extracted records under the key `"posts"` for `LINKEDIN_POST` campaigns.
  - Prior pipeline scripts evaluated `leads = res.get('leads', [])`, resulting in 0 posts displayed despite successful scraper execution on Nexus's side.
  - Updated `NexusClient.get_campaign_leads()` to standardize and bridge all responses: guarantees that both `leads` and `posts` keys are populated across all campaign types.
  - Integrated automated deduplication directly inside `NexusClient.get_campaign_leads()` to filter duplicate items by unique post ID, URN, URL, or content before returning.
- **Enrichment Pipeline & Background Task Synchronization (`apps/enrichment/tasks.py`)**:
  - Updated Celery task `poll_nexus_linkedin_enrichment` to safely parse `posts_res.get('posts') or posts_res.get('leads', [])`.
  - Future LinkedIn post campaigns automatically ingest post data into `raw_data['nexus_linkedin_posts']` and `ai_clean_data['decision_maker_recent_posts']`.
- **Historical Campaign 2 Leads Post Ingestion & Backfill (`refetch_all_posts.py`, `sync_retro_to_lead.py`)**:
  - Re-scanned all 66 qualified leads of Campaign 2 against Nexus Data Solutions API.
  - Successfully retrieved posts for **22 decision makers** with active LinkedIn posting activity (total **83 posts**).
  - Synchronized post objects into CRM `Lead` records (`raw_data['nexus_linkedin_posts']` and `crm_signals['linkedin_posts']`).
- **Multi-Layer Post Deduplication Engine**:
  - Identified that Nexus API's scraper occasionally returns duplicate post entries for a given profile (e.g. `cam_han_140` returned 6 posts for 3 unique items).
  - Scanned and cleaned all historical database records across `CampaignResult` and `Lead` tables: 11 leads with duplicate entries were deduplicated (total duplicates in DB reduced from 40+ to exactly 0).
  - Implemented client-side synchronous deduplication inside `LeadView.tsx` to guarantee zero UI duplication regardless of backend payload state.
- **Frontend Stability & React Hook Lifecycle Hardening (`LeadView.tsx`)**:
  - Resolved `Error: Rendered more hooks than during the previous render` in `LeadView.tsx`: replaced conditional `useMemo` call (which was positioned after early `if (!isOpen || !lead) return null;`) with synchronous in-render JavaScript deduplication.
  - Cleared stale `.next` webpack chunk cache (`Error: Cannot find module './682.js'`) and restarted dev server. Verified clean production compilation (`next build`) and 200 OK responses across all routes.

### Phase 31: Eastern Timezone (Atlanta, GA) Date & Time Formatting Standardization (2026-10-12)
- **Timezone Standardization**:
  - Unified all date and time representations across the platform to US Eastern Time (`America/New_York`, Atlanta, GA).
  - Enforced consistent human-readable format: `"Mon, Jul 13, 2026, 04:47 PM"` (Day of week, Month Day, Year, 12-hour Hour:Minute AM/PM).
- **Frontend Utility Library (`frontend/src/lib/dateUtils.ts`)**:
  - Created reusable formatting utilities: `formatEasternDateTime`, `formatEasternDate`, and `formatEasternTime`.
  - Integrated across CRM views (`LeadTable.tsx`, `LeadView.tsx`, `page.tsx`), Lead Hunter (`CampaignDetails.tsx`, `page.tsx`), and Sales Action Center.

### Phase 32: Enterprise 0% Data Loss CRM Export Engine (JSON & .CSV) (2026-10-12)
- **Zero Data Loss Guarantee**:
  - Built an exhaustive export mapping guaranteeing that 100% of visible and database-stored fields are exportable without clipping or omissions.
  - **Company Firmographics**: Name, industry, website, domain, company phone, company email, effective email, LinkedIn URL, employee size, annual revenue (raw + clean), funding (raw + clean), technologies array, keywords, description, summary, ratings, reviews, pricing, working hours.
  - **Company Addresses & Geo**: Full formatted address, street, neighborhood, city, state, country, postal code, latitude, longitude, Google Maps URL.
  - **Social Profiles**: Direct links to Facebook, Twitter/X, Instagram, YouTube.
  - **Decision Makers**: Full name, first name, last name, job title, headline, seniority level, functional role, work email, personal email, phone, direct LinkedIn URL, location, and secondary contacts list (`company_people`).
  - **Rich LinkedIn Profile Intelligence**: Direct LinkedIn URL, full name, headline, summary/about, registered date (ISO + Eastern), follower count, connection count, badges (`is_premium`, `is_influencer`, `is_creator`, `is_open_to_work`, `is_hiring`, `verified`, `is_paid_advertiser`), skills list, languages, certifications, full experience history, full education history, honors/awards, volunteering, projects, courses, services, and profile/cover image URLs.
  - **Rich LinkedIn Posts & Social Activity**: Total post count, latest post text, latest post date (ISO + Eastern), likes, comments, shares, reactions breakdown, direct post URL, full article details, and condensed string summary of all posts.
  - **AI ICP Intelligence & Qualification**: Qualification score (0-100), ICP score tier/label, score justification reasons, pain points, operational gaps, expansion opportunities, complete sales brief, "Why Now" urgency trigger, and recommended service.
  - **Outreach & Communication**: Cold email draft subject line and body text.
  - **Sales Workflow & Follow-ups**: Follow-up date (ISO + Eastern), time, status, priority, action type, notes, last contacted timestamp.
  - **Audit Timestamps**: Scraped date, lead creation date, and last update date (both raw ISO and standardized Eastern Time format `"Mon, Jul 13, 2026, 04:47 PM"`).
- **Clean Web Scraping Exclusion (No Raw Bloat)**:
  - Explicitly stripped raw HTML/markdown dumps (`firecrawl_raw_data`) from exports so exported files remain clean, lightweight, and structured for CRM/BI ingestion.
- **Backend Serialization Alignment (`backend/apps/crm/views.py`)**:
  - Updated `_serialize_lead` to ensure `linkedin_profile` and `linkedin_posts` fall back across `crm_signals`, `raw_data`, and `ai_consolidated_data`, ensuring zero omissions regardless of lead stage.
- **RFC 4180 CSV & Formatted JSON Compliance**:
  - Safe CSV escaping with double quotes and sanitized line breaks for multi-line text and JSON blocks.
  - Clean formatted JSON output with standardized filenames `leads_export_YYYY-MM-DD_HH-mm-ss.csv` and `.json`.

### Phase 33: Comprehensive System & Security Audit Priority Fixes (P0-P3) (2026-10-12)
- **P0 Critical Fixes**:
  - **CRIT-2 (BUG-1) NameError Fix (`backend/apps/crm/views.py`)**: Fixed crash in `LeadLogOutreachView` where `valid_statuses` was undefined when updating `new_status`. Explicitly defined `valid_statuses = [choice[0] for choice in Lead.STATUS_CHOICES]`.
  - **CRIT-3 BasicAuthMiddleware Registration (`backend/config/settings.py`)**: Added `config.basic_auth_middleware.BasicAuthMiddleware` to the active Django `MIDDLEWARE` stack directly following `AuthenticationMiddleware`, protecting all non-DRF views while honoring session and Bearer auth.
  - **CRIT-1 Security Audit & Environment Secret Check**: Verified Git history (`git log --all --full-history -- backend/.env .env`) confirming `.env` has never been committed or leaked to version control.
- **P1 High-Priority Architectural Fixes**:
  - **CRIT-4 Cloudflare SSL Termination Documentation (`backend/config/settings.py`)**: Explicitly documented `SECURE_SSL_REDIRECT = False` rationale to prevent Cloudflare redirect loops while maintaining strict HSTS and secure cookies.
  - **ARCH-2 Elimination of N+1 Queries in Lead List View (`backend/apps/crm/views.py`)**: Added `'company_people'` to `prefetch_related` in `LeadListCreateView.get()`, preventing an extra SQL roundtrip per serialized lead.
  - **BUG-3 Unpaginated Leads OOM Safeguard (`backend/apps/crm/views.py`)**: Enforced a 500-lead maximum safety limit (`leads[:500]`) on unpaginated fallback queries to eliminate server memory exhaustion risks.
- **P2 Medium-Priority & Celery Beat Automation**:
  - **ARCH-5 JWT Access Token Lifetime Hardening (`backend/config/settings.py`)**: Reduced `ACCESS_TOKEN_LIFETIME` from 24 hours (`days=1`) to industry-standard 60 minutes (`minutes=60`), while maintaining a 7-day refresh token window.
  - **MISS-2 Automated Periodic Lead Scoring in Celery Beat (`backend/config/settings.py`)**: Added `score-pending-leads-every-hour` (`crontab(minute='15', hour='*')`) to `CELERY_BEAT_SCHEDULE`, guaranteeing that unscored and pending leads are automatically qualified and scored.
  - **ARCH-4 Modernized Asyncio Event Loop (`backend/apps/lead_hunter/views.py`)**: Replaced deprecated `asyncio.get_event_loop()` with modern `asyncio.get_running_loop()` in the SSE streaming view, and removed unused `AllowAny` import.
  - **MISS-1 Enrichment App Architecture Documentation**: Documented that `apps.enrichment` is a dedicated background task and data persistence engine (tasks, scraping, Ollama, models) without direct HTTP endpoints, cleanly serving through CRM views.
- **P3 Codebase Polish & Hygiene**:
  - **Duplicate Cleanups (`backend/agents/import_agent.py`)**: Removed duplicate `ai_data = cr.ai_clean_data or {}` assignment.
  - **Canonical Serialization & Social Links (`backend/apps/crm/views.py`)**: Reused modular `_serialize_person` with `city`, `state`, `country` support; added `tiktok_url` and `pinterest_url` to serialization; moved `import uuid` to module header.
  - **Dynamic Next.js Host Handling (`frontend/src/middleware.ts`)**: Replaced hardcoded `localhost:5000` redirect fallback with dynamic `req.nextUrl.host` and protocol resolution.
  - **Scratch Script Migration**: Relocated 7 root-level scratch scripts (`check_posts.py`, `get_lead_stats.py`, `query_stats.py`, `refetch_all_posts.py`, `retro_update_campaign_2.py`, `scratch_inspect.py`, `sync_retro_to_lead.py`) into organized `backend/scripts/`.

### Phase 34: Strict Lead Limits (250–1,000), Security Loopholes & Codebase Audit Hardening (2026-10-14)
- **Strict Lead Limit Enforcement (Min 250 – Max 1,000 Leads)**:
  - **Backend Model (`backend/apps/lead_hunter/models.py`)**: `Campaign.lead_count` setter and clean method clamp values strictly: `min(1000, max(250, value))`.
  - **Backend Views (`backend/apps/lead_hunter/views.py`)**: Clamped in `CampaignListCreateView.post`, `CampaignDetailView.patch`, and `RunCampaignView.post`.
  - **Frontend Form UI (`frontend/src/app/(dashboard)/lead-hunter/components/CampaignForm.tsx`)**: Hard-coded `min="250"` and `max="1000"` attributes on `<input type="number">`, real-time clamping on `onChange` and `onBlur`, inline validation warning banner, and updated form labels to `(Min 250 – Max 1,000)`.
- **Atomic Campaign Run Lock (SEC-1)**:
  - Wrapped `RunCampaignView.post` in `transaction.atomic()` with `Campaign.objects.select_for_update()`.
  - Blocks concurrent duplicate runs from firing multiple billable tasks against Nexus Data Solutions ($15/1k leads) and handles invalid actor types gracefully.
- **Silent JWT Refresh & API Route 401 Isolation (SEC-2)**:
  - Added 7-day `reli_refresh_token` httpOnly cookie persistence alongside `reli_session_token` in `frontend/src/app/auth-api/login/route.ts` and clean deletion in `logout/route.ts`.
  - Updated `frontend/src/middleware.ts` to silently request a new access token from `/api/token/refresh/` upon session token expiration without dropping active user work.
  - Prevented 307 HTML login redirects on `/api/*` endpoints by returning `{ error: 'Unauthorized', code: 'token_expired' }` with HTTP 401.
- **Eliminated Wildcard CORS (SEC-3)**:
  - Removed `'Access-Control-Allow-Origin': '*'` from `frontend/src/app/api/lead-hunter/stream/route.ts`, enforcing strict same-origin isolation for live SSE logs.
- **Prompt Injection Defense & Robust JSON Parser (SEC-4 & BUG-2)**:
  - Encapsulated untrusted external website content inside `<untrusted_scraped_website_content>` XML tags in `backend/services/ai_client.py` (`consolidate_lead_data`) with explicit LLM security instructions.
  - Replaced flawed greedy regex `(\{[\s\S]*\})` in `_parse_json` with a state-machine balanced bracket counter and markdown code fence extractor.
- **Avatar Upload Guard (SEC-5)**:
  - Added 2MB client-side size check and MIME type validation in `frontend/src/app/(dashboard)/settings/page.tsx` (`handleImageUpload`).
  - Added 3MB string length check and format validation in `backend/apps/users/views.py` (`profile_view`).
- **Dead Code Eradication**:
  - Deleted unreferenced `frontend/src/app/(dashboard)/sales/components/FollowUpQueue.tsx` (356 lines).
  - Deleted orphaned `backend/services/prompts/email_draft_prompt.txt` & `insight_prompt.txt`.
  - Deleted legacy real-estate method `identify_decision_makers` in `backend/services/ai_client.py`.
  - Deleted uncalled `BulkImportLeadsView` from `backend/apps/crm/views.py` and `backend/apps/crm/urls.py`.
- **CRM Page Modularity Refactoring**:
  - Extracted 490 lines of CSV and JSON export transformation logic from `frontend/src/app/(dashboard)/crm/[[...slug]]/page.tsx` into modular `frontend/src/app/(dashboard)/crm/components/CRMExportModal.tsx`, reducing page size from 1,059 lines to ~570 lines.
- **Verification & Service Restart**:
  - Unified local virtual environment dependencies in `backend/.venv`.
  - Executed `npx tsc --noEmit` (0 errors) and `manage.py check` (0 issues).
  - Successfully restarted services via `./stop-all.sh` and `./start-all.sh`.


