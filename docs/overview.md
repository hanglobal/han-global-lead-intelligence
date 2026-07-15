# Real Estate Lead Intelligence — Overview

## Project Description

A full-stack AI-powered real estate CRM platform. Users create lead generation campaigns, the system fires Apify scrapers (Google Maps), and results flow through an automated agent pipeline: raw save → deduplication → lead creation → scoring. A Firecrawl integration enriches leads with website content, and an AI Engine (Ollama/Claude) consolidates data and extracts insights.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 4.2, Django REST Framework, django-environ |
| Frontend | Next.js 14 (App Router), TypeScript, Vanilla CSS |
| Database | PostgreSQL 14+ |
| Task Queue | Celery 5 + Redis |
| Web Scraper | Apify — Google Maps Actor (`nwua9Gu5YrADL7ZDj`) |
| Web Crawler | Firecrawl SDK (enrichment) |
| Real-time | Redis pub/sub → SSE (`/api/lead-hunter/stream/`) |
| AI (planned) | Ollama (local), Anthropic Claude (fallback) |

## Build Status

| Phase | Description | Status |
|---|---|---|
| 1 | Django scaffold, django-environ, all dependencies | ✅ Done |
| 2 | DB models — Campaign, Lead, enrichment models | ✅ Done |
| 3 | Campaign API + Apify + Celery polling + SSE | ✅ Done |
| 4 | 4 CRM agents (dedup, import, score, supervisor) | ✅ Done |
| 4.5 | Schema restoration + sequential IDs + Firecrawl test | ✅ Done |
| 5 | Enrichment layer — Firecrawl + CRM signal detection | ✅ Done |
| 6 | AI insights + email draft (Ollama → Claude) | ✅ Done |
| 7 | Full CRM REST API (filters, pagination, soft delete) | ✅ Done |
| 8 | Frontend polish — pagination, actor type selector | ✅ Done |
| 9 | Celery Beat, JSON logging, health check | ❌ Pending |
| 10 | Docker Compose, deployment prep | ❌ Pending |

## Core Workflow

### Lead Hunter
1. User creates a campaign (name, location, niche, max leads)
2. System fires Apify Google Maps actor
3. Apify calls webhook on completion **OR** Celery polls every 30s (fallback)
4. Results flow through the **ImportSupervisor** pipeline:
   - **LeadRawSaveAgent** → saves ALL items as `CampaignResult` (full backup)
   - **LeadDedupAgent** → filters duplicates by `place_id`
   - **LeadImportAgent** → creates `Lead` records for unique items only
   - **LeadScoreAgent** → computes `score` (0–100) and `score_label` (hot/warm/cold)
5. Real-time SSE update pushed to frontend via Redis pub/sub

### CRM
- All leads visible in filterable, searchable table
- Lead detail modal (Info, Address, Social, Activity)
- Status management (8 pipeline stages), notes, tags
- Bulk CSV/JSON import with dedup preview
- Client-side CSV export (filtered)
- Bulk re-scoring via lightning button
- CompanyPerson contacts per lead

### Enrichment (Phase 5) & AI Integration (Phase 6)
- `LeadEnrichment` model stores Firecrawl raw scrape results in `web_scrape_raw` JSONField
- `test_firecrawl.py` (and background tasks) crawl targeted pages
- AI Engine (`AIClient` via Ollama/Claude) consolidates Google Maps + Firecrawl data into clean structured JSON (`ai_clean_data`)
- AI-generated insights and email drafts functionality implemented in backend services

## ID Format

| Model | Format | Example |
|---|---|---|
| Lead | `LID-{sequential count}` | `LID-1`, `LID-42` |
| Campaign | `CID-{sequential count}` | `CID-1`, `CID-7` |

IDs are count-based (not UUID), generated at save time, strictly sequential.

## Application Pages

### `/lead-hunter`
- Campaign list: Name, CID (monospace), Created date, Status badge
- Create / Edit campaign modals
- Campaign detail: stats grid (Niche, Location, Target, Scraped, Synced, Leads Found)
- Run button, SSE live status updates

### `/crm`
- Dashboard stat cards (total leads, by status, growth charts)
- Leads table — columns: LID, Name, Category, Score badge, Status, Campaign, Date
- Filter panel — status, category, campaign, rating range, review range
- Search bar (expandable)
- Lead view modal — full contact + address + activity + company people
- Import modal — JSON or CSV, with dedup preview stats
- Export — filtered leads to CSV
- Bulk scoring via Celery

### `/settings` *(stub)*
- API key management
- Integration configuration

## Environment Variables

```env
# Django
DJANGO_SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=reli-han
DB_USER=postgres
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432

# Redis / Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Apify
APIFY_API_KEY=
APIFY_ACTOR_GMAP=nwua9Gu5YrADL7ZDj
APIFY_ACTOR_WEB_SCRAPER=
APIFY_ACTOR_LINKEDIN=

# Firecrawl (Phase 5 — Enrichment)
FIRECRAWL_API_KEY=

# Backend public URL (for Apify webhooks — use ngrok in dev)
BACKEND_URL=https://apis-app.hgcrmsolutions.com

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```
