# Real Estate CRM + AI Engine — Build Plan

> Stack: Django · PostgreSQL · Next.js · Apify · Ollama · Claude API
> Follow this plan in order. Do not skip phases.

---

## PHASE 1 — Django Backend Scaffold ✅

**Goal:** Clean production-ready Django project structure.

### Tasks
- [x] Initialize Django project with Python 3.12
- [x] Configure PostgreSQL via environment variables
- [x] Set up `django-environ` for `.env` management
- [x] Create app structure:
  ```
  backend/
  ├── config/         # settings, urls, wsgi (kept as config/ not core/)
  ├── apps/
  │   ├── lead_hunter/  # campaigns (plan: campaigns/)
  │   ├── crm/          # leads + agents (plan: leads/ + agents/)
  │   ├── enrichment/   # website crawling, extraction
  │   └── users/        # auth
  ├── services/       # AI, Apify, crawler clients
  ├── utils/          # shared helpers
  └── manage.py
  ```
- [x] Install core dependencies:
      djangorestframework, celery, redis, httpx,
      beautifulsoup4, pydantic, ruff, anthropic, django-environ
- [x] Set up Celery + Redis for background tasks
- [x] Configure CORS for Next.js frontend

---

## PHASE 2 — Database Models ✅

**Goal:** Define all tables before writing any business logic.

### `campaigns` app → `apps/lead_hunter`

```
Campaign
- id (int PK — plan: UUID, kept int to avoid migration risk)
- campaign_id (unique string, auto-generated: CMP-YYYY-XXXXXX) ✅
- name ✅
- location ✅
- niche ✅
- lead_count (plan: max_leads) ✅
- actor_type (gmap | web_scraper | linkedin) ✅
- status (pending | running | completed | failed) ✅
- apify_task_id (plan: apify_run_id) ✅
- total_leads_found ✅
- created_at ✅
- updated_at ✅
```

### `leads` app → `apps/crm`

```
Lead
- id (int PK — plan: UUID, kept int to avoid migration risk)
- lid (plan: lead_id, format: LEAD-YYYY-XXXXXX) ✅
- campaign_ref (FK → Campaign, nullable) ✅
- campaign_id (CharField, kept for backward compat)
- place_id (unique, dedup for gmap) ✅
- source ✅
- name (plan: company_name) ✅
- website, address, category, reviews_count, rating, phone, email ✅
- social_links (JSONField) ✅
- status (new|prospecting|qualified|contacted|engaged|negotiation|won|lost)
  ⚠️ differs from plan — kept to not break frontend
- score (int 0–100) ✅
- score_label (high | medium | low) ✅
- classification ✅
- crm_signals (JSONField) ✅
- created_at, updated_at ✅
```

### `enrichment` app

```
LeadEnrichment ✅
- lead (OneToOne FK → Lead)
- emails_found, phones_found, contact_page_url, social_links
- has_crm, has_lead_capture, has_saved_search, has_login_portal
- website_quality_score, raw_crawl_data, enriched_at

LeadInsight ✅
- lead (OneToOne FK → Lead)
- pain_points, operational_gap, opportunity, generated_at

LeadEmailDraft ✅
- lead (FK → Lead)
- subject, body, created_at, updated_at
```

### Migrations
- [x] `makemigrations` for all apps
- [x] `migrate`

---

## PHASE 3 — Campaign API + Apify Integration ✅

**Goal:** User creates campaign → selects actor → system fires Apify → results return automatically.

### Apify Actors Supported

| Actor | actor_type value | Use case |
|---|---|---|
| Google Maps Scraper | `gmap` | Local real estate businesses |
| Web Scraper | `web_scraper` | Custom URLs / property sites |
| LinkedIn Scraper | `linkedin` | Agents, brokers by profile |

### Tasks

#### Campaign endpoints
- [x] `POST /api/lead-hunter/campaigns/` — create campaign, auto-assign campaign_id
- [x] `GET /api/lead-hunter/campaigns/` — list campaigns
- [x] `GET /api/lead-hunter/campaigns/{id}/` — campaign detail + lead count
- [x] `POST /api/lead-hunter/campaigns/{id}/run/` — trigger Apify actor run
- [x] `GET /api/lead-hunter/campaigns/{id}/check-status/` — current run status

#### Apify service (`services/apify.py`) ✅
- [x] `ApifyClient` class:
  - `run_actor(actor_type, location, niche, max_leads, webhook_url)` → returns `run_id`
  - `get_run_status(run_id)` → returns status dict
  - `get_run_results(run_id)` → returns raw lead list
- [x] Actor ID resolved from `actor_type` via env config
- [x] Store `apify_task_id` on Campaign

#### Background task (Celery) ✅
- [x] `poll_apify_run(campaign_id)` in `apps/lead_hunter/tasks.py`:
  - Polls every 30s until Apify run completes
  - On complete → triggers agent pipeline + SSE event
  - On fail → marks campaign as failed
  - Webhook is primary; polling is fallback (exits if webhook already completed)

#### Bonus (not in plan, already implemented)
- [x] Apify webhook handler `POST /api/lead-hunter/webhook/apify/`
- [x] Real-time SSE stream `GET /api/lead-hunter/stream/` (Redis pub/sub)

---

## PHASE 4 — 4 CRM Agents ✅ Done

**Goal:** Raw Apify results → clean, scored, CRM-ready leads.

All agents run as Celery tasks in sequence after Apify completes.

### Agent 1 — Deduplication Agent ⚠️
**File:** `apps/crm/agents/dedup_agent.py`
- [x] Deduplicates by `place_id` for `gmap` source
- [ ] Deduplicates by `website` + `company_name` for `linkedin` / `web_scraper`
- [x] Returns: list of new raw leads

### Agent 2 — Create Lead Agent ✅
**File:** `apps/crm/agents/import_agent.py` (merged with agent 2)
- [x] Auto-generate `lid` (format: `LID-001` sequence)
- [x] Map raw Apify fields → Lead model fields
- [x] Set `source` from campaign `actor_type`
- [x] Set initial `status = new`
- [x] Use `bulk_create` (via optimized sequential loop)

### Agent 3 — Scoring Agent ⚠️
**File:** `apps/crm/agents/score_agent.py`
- [x] Process in batches of 100
- [x] Rule-based scoring (0–100), saves `score` + `score_label`
- [ ] Use Ollama for classification (business type detection)
- [ ] Fall back to Claude API when Ollama is unavailable

### Agent 4 — Import / Export Agent ✅
**File:** `apps/crm/agents/import_agent.py` + `apps/crm/views.py`
- [x] Import: `POST /api/crm/leads/bulk-import/` — bulk JSON + CSV, with dedup
- [x] Export: `GET /api/leads/export/` — backend CSV endpoint with query param filters

---

## PHASE 5 — Enrichment Layer ❌

**Goal:** Crawl each lead's website, extract contact info and CRM signals.

### Crawler service (`services/crawler.py`)
- [ ] `WebCrawler` class using `httpx` + `BeautifulSoup`:
  - `crawl(url)` → returns HTML string
  - `extract_emails(html)` → list of emails
  - `extract_phones(html)` → list of phone numbers
  - `find_contact_page(html, base_url)` → contact page URL or None
  - `extract_social_links(html)` → dict of platform → URL
  - `detect_crm_signals(html)` → dict (has_crm, has_lead_capture, has_saved_search, has_login_portal)
  - `score_website_quality(html)` → int 0–100

### Enrichment tasks (`tasks/enrichment_tasks.py`)
- [ ] `enrich_lead(lead_id)` — single lead, Celery task
- [ ] `bulk_enrich_campaign(campaign_id)` — all high + medium leads in campaign
- [ ] Save to `LeadEnrichment`
- [ ] Update Lead `status → enriched`

### Enrichment API
- [ ] `POST /api/leads/{id}/enrich/` — trigger single enrichment
- [ ] `POST /api/campaigns/{id}/enrich-all/` — enrich all qualified leads

---

## PHASE 6 — Insight + Email Draft Generation ❌

**Goal:** Per lead, generate pain points and a short personalized email draft. No sending.

### AI service (`services/ai_client.py`)
- [ ] `AIClient` class:
  - Primary: Ollama (local, fast, free)
  - Fallback: Claude API (heavy reasoning, when Ollama unavailable)
  - `generate_insights(lead_data)` → returns pain_points, operational_gap, opportunity
  - `generate_email_draft(lead_data, insights)` → returns subject, body
- [ ] Prompt templates in `services/prompts/`:
  - `insight_prompt.txt`
  - `email_draft_prompt.txt`

### Tasks
- [ ] `generate_lead_insights(lead_id)` — Celery task, saves to `LeadInsight`
- [ ] `generate_email_draft(lead_id)` — Celery task, saves to `LeadEmailDraft`

### API
- [ ] `POST /api/leads/{id}/generate-insights/`
- [ ] `POST /api/leads/{id}/generate-email-draft/`
- [ ] `GET /api/leads/{id}/email-drafts/` — list drafts
- [ ] `PATCH /api/leads/{id}/email-drafts/{draft_id}/` — edit draft
- [ ] `DELETE /api/leads/{id}/email-drafts/{draft_id}/` — delete draft

---

## PHASE 7 — CRM Panel APIs ⚠️ Partial

**Goal:** All data endpoints the frontend needs.

### Lead endpoints
- [x] `GET /api/crm/leads/` — paginated list with filters: `?status=`, `?search=`, `?campaign_id=`
- [ ] `GET /api/crm/leads/` — missing filters: `?score_label=`, `?source=`
- [x] `GET /api/crm/leads/{id}/` — lead detail + activities
- [ ] Combined detail: enrichment + insights + email drafts (Phases 5/6 pending)
- [x] `PATCH /api/crm/leads/{id}/status/` — update status
- [x] `DELETE /api/crm/leads/{id}/` — hard delete (plan: soft delete via status=disqualified)

### Dashboard endpoint ⚠️
- [x] `GET /api/crm/stats/` — total + by_status
- [ ] Missing: `by_score`, `campaigns_run`, `leads_this_week`

---

## PHASE 8 — Next.js Frontend ⚠️ Partial

**Goal:** Two panels — Lead Hunter and CRM.

### Setup
- [x] Next.js App Router + TypeScript strict mode
- [x] Tailwind CSS
- [ ] shadcn/ui (using custom CSS classes instead)
- [ ] `lib/api/` — typed API client (using raw axios per component)
- [x] Sidebar layout with two sections: Lead Hunter / CRM

### Lead Hunter Panel (`/lead-hunter`)
- [x] Campaign list — table with status badges, lead count, created date
- [x] Create campaign form: name, location, niche, max_leads
- [ ] Actor selector: Google Maps / Web Scraper / LinkedIn (field missing)
- [x] Campaign detail — status, leads found, run again button
- [x] Live status via SSE (real-time, better than 10s polling)

### CRM Panel (`/crm`)
- [x] Dashboard page — stat cards by status
- [x] Leads table — columns: lid, name, category, score, status, campaign, date
- [x] Filter bar: status, category, campaign, rating range, review range
- [ ] Filter by: score_label, source (not yet)
- [ ] Pagination (all leads loaded at once)
- [x] Row click → Lead View Modal
- [x] Lead View Modal — Info tab (contact, address, maps link, notes, tags, activity)
- [ ] Lead View Modal — tabbed (Enrichment / Insights / Email Draft tabs missing)
- [ ] Status dropdown inside modal (read-only currently)
- [x] Import button → CSV/JSON upload modal with dedup preview
- [x] Export button → CSV download (filtered, client-side)

---

## PHASE 9 — Background Jobs + Observability ❌

### Tasks
- [ ] Celery Beat scheduled task:
  - `sync_running_campaigns` — every 60s, polls all campaigns with status `running`
- [x] Django Admin registered for all models (crm, lead_hunter, enrichment)
- [ ] Structured JSON logging for all agent runs
- [ ] Health check endpoint: `GET /api/health/`

---

## PHASE 10 — Deployment Prep ⚠️ Partial

### Tasks
- [ ] `docker-compose.yml` (Django, PostgreSQL, Redis, Celery worker, Celery beat, Next.js)
- [x] `.env.example` with all variables
- [x] `README.md` — setup + run instructions
- [x] `start-all.sh` / `stop-all.sh` (bonus — local dev scripts)
- [x] `cloudflared.service` (bonus — tunnel for Apify webhooks)

---

## Environment Variables

```env
# Django
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=

# Database
DB_NAME=realestate_leads
DB_USER=postgres
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432

# Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Apify
APIFY_API_KEY=
APIFY_ACTOR_GMAP=jco0GaQY70XZcwqDI
APIFY_ACTOR_WEB_SCRAPER=
APIFY_ACTOR_LINKEDIN=

# AI (Phase 6)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
ANTHROPIC_API_KEY=

# Backend public URL
BACKEND_URL=http://localhost:5050

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Build Order Summary

```
Phase 1  ✅ Django scaffold
Phase 2  ✅ All DB models + migrations
Phase 3  ✅ Campaign API + Apify (gmap, web scraper, linkedin)
Phase 4  ✅ 4 agents: dedup → create lead → scoring → import/export
Phase 5  ❌ Enrichment: crawler + extraction + CRM signals
Phase 6  ❌ Insight generation + email draft (Ollama → Claude fallback)
Phase 7  ⚠️ CRM panel REST APIs
Phase 8  ⚠️ Next.js frontend: Lead Hunter + CRM panels
Phase 9  ❌ Celery background jobs + logging
Phase 10 ⚠️ Docker + deployment prep
```

> Start from Phase 1. Complete each phase before moving to the next.
> No email sending. No outreach automation. Email draft only.
> Apify supports 3 actors: gmap, web_scraper, linkedin.