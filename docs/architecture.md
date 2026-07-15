# System Architecture

## Overview

The Real Estate Lead Intelligence system follows a layered client-server architecture.
The Next.js frontend communicates with the Django REST API via Axios and SSE.
Heavy work is delegated to Celery background tasks and external services (Apify, Firecrawl).

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (3000)                      │
│   Lead Hunter Panel          CRM Panel             Settings      │
│   /lead-hunter               /crm                  /settings     │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ HTTP (Axios) + SSE
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Django REST API (5050)                        │
│                                                                  │
│  /api/lead-hunter/            /api/crm/                          │
│  ├── campaigns/               ├── leads/                         │
│  ├── campaigns/{id}/          ├── leads/{id}/                    │
│  ├── campaigns/{id}/run/      ├── leads/{id}/status/             │
│  ├── campaigns/{id}/status/   ├── leads/{id}/notes/              │
│  ├── campaigns/{id}/results/  ├── leads/{id}/activities/         │
│  ├── webhook/apify/           ├── leads/{id}/people/             │
│  ├── stats/                   ├── leads/bulk-import/             │
│  └── stream/ (SSE)            ├── leads/bulk-score/              │
│                               └── stats/                         │
└────┬───────────────┬──────────────────────┬───────────────────┬──┘
     │               │                      │                   │
     ▼               ▼                      ▼                   ▼
┌─────────┐   ┌─────────────┐   ┌───────────────────┐   ┌──────────┐
│PostgreSQL│   │   Redis     │   │  Apify API        │   │Firecrawl │
│(5432)   │   │(6379)       │   │  (external)       │   │  API     │
│         │   │• Celery     │   │  • gmap actor     │   │          │
│• leads  │   │  broker     │   │  (nwua9Gu5Y...)   │   └──────────┘
│• camps  │   │• result     │   └───────────────────┘
│• enrich │   │  backend    │
└─────────┘   │• pub/sub    │
              │  (SSE)      │
              └──────┬──────┘
                     │
                     ▼
          ┌─────────────────────┐
          │   Celery Workers    │
          │                     │
          │ poll_apify_run      │  ← polls every 30s (fallback)
          │ score_pending_leads │  ← batch scoring after import
          └─────────────────────┘
```

## Backend Directory Structure

```
backend/
├── config/                  # Django settings, urls, wsgi, celery
├── apps/
│   ├── lead_hunter/         # Campaigns, Apify integration, webhook, SSE
│   │   ├── models.py        # Campaign (CID-N), CampaignResult
│   │   ├── views.py         # CRUD + Run + Webhook + SSE + Stats
│   │   ├── tasks.py         # poll_apify_run (Celery)
│   │   ├── apify_service.py # thin wrappers → services/apify.py
│   │   └── services.py      # sync_campaign_results → ImportSupervisor
│   ├── crm/                 # Leads, agents, scoring
│   │   ├── models.py        # Lead (LID-N), LeadActivity, CompanyPerson
│   │   ├── views.py         # _serialize_lead() + all CRUD + stats
│   │   ├── tasks.py         # score_pending_leads (Celery)
│   │   └── agents/
│   │       ├── dedup_agent.py      # place_id dedup within batch + vs DB
│   │       ├── import_agent.py     # LeadRawSaveAgent + LeadImportAgent
│   │       ├── score_agent.py      # rule-based 0-100 scoring
│   │       └── supervisor.py       # RawSave→Dedup→Import→Score pipeline
│   ├── enrichment/          # Phase 5 & 6 — Firecrawl + AI integration
│   │   ├── models.py        # LeadEnrichment (web_scrape_raw), LeadEmailDraft
│   │   └── tasks.py         # AI consolidation + Firecrawl tasks
│   └── users/               # Auth (future)
├── services/
│   ├── apify.py             # ApifyClient class (Google Maps)
│   ├── firecrawl_client.py  # FirecrawlClient (include_paths support)
│   └── ai_client.py         # AIClient for Ollama / Claude (data consolidation)
├── test_firecrawl.py        # Standalone test: crawl → save to DB + .md report
└── utils/                   # Shared helpers
```

## Database Tables

| Table | App | Purpose |
|---|---|---|
| `lead_hunter_campaigns` | lead_hunter | Campaign metadata, status, Apify run ID |
| `lead_hunter_results` | lead_hunter | Raw Apify dataset items (full backup) |
| `crm_leads` | crm | Processed CRM leads (LID-N) |
| `crm_lead_activities` | crm | Status change log |
| `crm_company_people` | crm | Individual contacts per lead |
| `enrichment_lead_enrichment` | enrichment | Firecrawl raw scrape JSON |
| `enrichment_lead_email_draft` | enrichment | AI email drafts |

## Key Data Flow

### Campaign Run
```
User clicks Run
  → POST /api/lead-hunter/campaigns/{id}/run/
  → services/apify.py → Apify starts gmap actor async
  → Celery: poll_apify_run fires every 30s (fallback)
  → Apify calls /api/lead-hunter/webhook/apify/ on completion (primary)
  → sync_campaign_results() → ImportSupervisor:
      1. LeadRawSaveAgent  → saves ALL items as CampaignResult
      2. LeadDedupAgent    → filters by place_id (batch + CRM)
      3. LeadImportAgent   → creates Lead records for unique items
      4. LeadScoreAgent    → run_async() via Celery
  → Redis pub/sub publishes CAMPAIGN_COMPLETED
  → SSE stream pushes to all connected Next.js clients
```

### Lead Scoring
```
score = Lead.calculate_score()     # rule-based, 0–100
  + company_email present  → +20
  + phone present          → +15
  + website present        → +15
  + rating (up to 4.5★)   → up to +15
  + 10+ reviews            → +10
  + any social link        → +10
  + address                → +5
  + category               → +5
  + google_maps_url        → +5

label = Lead.calculate_score_label(score)
  >= 70 → 'hot'
  >= 40 → 'warm'
   < 40 → 'cold'
```

### Firecrawl Enrichment & AI Consolidation
```
Celery task (scrape_lead_website_task)
  → FirecrawlClient.crawl_website(url)
  → Saves raw scrape to CampaignResult.firecrawl_raw_data
  → Triggers process_result_with_llm_task
  → AIClient merges Gmap + Firecrawl data into clean JSON
  → Final cleaned data is imported into CRM via LeadImportAgent
```

### ID Generation
```
New Campaign saved:
  campaign_id = f"CID-{Campaign.objects.count() + 1}"

New Lead saved:
  lid = f"LID-{Lead.objects.count() + 1}"
```

## Scalability

- Stateless API — horizontally scalable
- Celery workers — scale independently from web workers
- Redis pub/sub — lightweight real-time without WebSocket server
- PostgreSQL — reliable relational storage with JSON fields for flexible raw data
- `_serialize_lead()` helper ensures consistent API responses across all endpoints
