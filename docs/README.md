# 🌐 Han Global Lead Intelligence

An AI-driven enterprise B2B Lead Intelligence, Enrichment, and CRM Sales Execution platform built for high-touch prospecting and sales automation.

---

## ⚡ Key Highlights & Architecture

- **Nexus B2B Ingestion**: Direct integration with Nexus Data Solutions sourcing 29 verified firmographic and decision-maker contact fields (`full_name`, `email`, `personal_email`, `mobile_number`, `linkedin`, `company_annual_revenue`, `company_technologies`, etc.).
- **Smart LinkedIn Deduplication & Cache Reuse (`LinkedInProfileCache`)**: Zero double-charge guarantee ($6/1k profile + $3/1k posts saved). Canonical URL normalizer and 3-tier database cache reuse existing profiles and posts across leads and campaigns without touching Nexus balance.
- **Minimum 250 Lead Enforcement**: Hardcoded minimum 250 lead limit across frontend campaign creation modal and backend views (`lead_count = max(250, ...)`), with auto-snapping and client-selectable higher maximums.
- **3-Tier AI Resilience Engine (`AIClient`)**: Automatic cascade failover:
  1. *Tier 1 (Primary)*: `glm-5.3:cloud` via Ollama Cloud API.
  2. *Tier 2 (Secondary)*: `minimax-m3:cloud` via Ollama Cloud API.
  3. *Tier 3 (Final Failover)*: Anthropic Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`).
  - Regex-assisted resilient JSON extraction handles thinking tokens and markdown code fences cleanly.
- **High-Throughput Parallel Concurrency**: Celery worker runs with `--concurrency=2` (dual ForkPoolWorkers) and optimized 8s Firecrawl scrape buffer (well within 10 req/min limit), boosting pipeline speed by ~800%.
- **Self-Healing Pipeline & Dead-Letter Sweeper**:
  - Run ID pre-flight validation prevents ghost campaigns.
  - Automatic retry for transient Nexus lead download drops.
  - Loop continuation ensures leads without websites never halt the scrape chain.
  - Celery terminal retry traps guarantee campaigns never freeze in `'running'` forever.
  - 4-Case Dead-Letter Sweeper (`sweep_stuck_leads`) recovers stuck post-LLM, pre-scrape, post-scrape leads and stalled campaigns every 30 minutes.
  - Database operations are 100% idempotent (`update_or_create` on `LeadInsight` and `LeadEmailDraft`) with atomic row-level locks (`select_for_update`).
- **Dedicated Sales Action Layer (`/sales`)**: Built according to client specifications (`docs/Han_Global_Dashboard_Enhancement_Brief_Final.docx`) with 4 daily action buckets:
  1. **Send Today** (Contact-ready accounts with verified emails & decision makers)
  2. **Follow-Up Today** (Scheduled touches due today & overdue alerts)
  3. **Meetings & Deals** (In-flight sales pipeline deals)
  4. **Needs Research** (High-fit companies missing direct contact info)
- **Sequential Collapsible CRM Lead View**: 5 structured dropdown sections (Company & Firmographics, Decision Maker & Direct Contacts, AI ICP Intelligence, AI Cold Outreach Pitch, Notes & Activity Timeline) featuring rotating chevrons, seamless borderless dividers, and 100% enterprise SVG iconography with zero emoji clutter.
- **Strict Solo-Admin Model**: Engineered strictly for a single root administrator (`admin`), eliminating multi-tenant complexity, workspace switches, or role permission overhead.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Sourcing ["1. Sourcing & Discovery"]
        A[Campaign Setup in Lead Hunter (Min 250)] -->|POST /api/v1/campaigns/run/| B[Nexus API Server]
        B -->|Async Polling every 15s| C[Celery Task: poll_nexus_campaign_run]
        C -->|Download 29 Fields| D[CampaignResult Raw Backup]
    end

    subgraph Intelligence ["2. Multi-Stage AI Pipeline (Concurrency 2)"]
        D --> E[Basic Qualification: Exact Reasons Logged]
        E -->|Unqualified| J[Immediate CRM Sync as Unqualified]
        E -->|Qualified| F[Firecrawl Website Deep Crawl (8s buffer)]
        F --> G[3-Tier AI: glm-5.3:cloud -> minimax-m3 -> Claude 3.5]
        G -->|Unqualified| J
        G -->|Qualified| H{LinkedIn Cache Check}
        H -->|Cache Hit| I[Reuse Profile & Posts - Save $0.009]
        H -->|Cache Miss| K[Nexus LinkedIn Scrape & Cache Result]
        K --> I
        I --> L[AI Strategic Insights & Cold Email Pitch]
    end

    subgraph CRM_and_Sales ["3. CRM & Sales Action Layer"]
        L --> M[(CRM Database: Lead & CompanyPerson)]
        J --> M
        M --> N[Sales Panel /sales: 4 Action Buckets]
        M --> O[Main CRM Leads Table & Filter View]
    end

    subgraph Auto_Recovery ["4. Background Self-Healing"]
        P[Celery Beat: sweep_stuck_leads] -.->|Every 30m: 4-Case Sweeper| F
        P -.->|Auto-Finalize Stalled Campaigns| M
    end
```

---

## 🚀 Quick Start & Management

### Launch All Services
```bash
./start-all.sh
```
This script starts:
- **Redis Server** (Port 6379)
- **PostgreSQL Database** (Port 5432)
- **Django REST Backend** (Port 5050 - Production ready via Daphne, strictly bound to `127.0.0.1`)
- **Celery Workers** (Dedicated Multi-Queue Architecture across 4 queues: `nexus_queue` [1 worker], `scrape_queue` [2 workers], `ai_queue` [3 workers], and `crm_queue` [1 worker] — total 7 slots)
- **Celery Beat** (Automated periodic task daemon: 30m stuck-lead sweeper & hourly lead scoring)
- **Next.js Frontend** (Port 5000)
- **Cloudflare Tunnel** (`https://apis-app.hgcrmsolutions.com`)

### Stop All Services
```bash
./stop-all.sh
```

### Validate Frontend Compilation
```bash
cd frontend && npx tsc --noEmit
```

---

## 📚 Repository Documentation Index

All detailed specifications, guides, and engineering rules are located in the `docs/` directory:

| Document | Description |
|---|---|
| [`docs/progress.md`](progress.md) | Comprehensive progress log with full status matrix and breakdown of all 33 completed phases. |
| [`docs/pipeline_deep_audit_and_hardening_report.md`](pipeline_deep_audit_and_hardening_report.md) | Senior-architect deep audit report covering 8 critical production failure modes, code fixes, and runbooks. |
| [`docs/project-scope.md`](project-scope.md) | High-level system scope, module specifications, 3-tier AI architecture, and design tokens. |
| [`docs/agent.md`](agent.md) | Core AI agent and developer guidelines, Solo-Admin rules, minimal UI standards, and backend safeguards. |
| [`docs/Nexus_API_Documentation_han.md`](Nexus_API_Documentation_han.md) | Reference documentation for external Nexus Data Solutions API integration. |
| [`docs/Han_Global_Dashboard_Enhancement_Brief_Final.docx`](Han_Global_Dashboard_Enhancement_Brief_Final.docx) | Client Phase 1 specification brief for Sales Action Center and CRM enhancements. |

---

## 🔒 Security & Solo-Admin Configuration

- **Single Superuser Account**: Controlled via environment variables (`DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_PASSWORD`, `BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD`). Script fails closed if no password is set to prevent default vulnerabilities.
- **Session Protection**: Real-time SSE stream `/api/lead-hunter/stream/` is strictly authenticated (returns 401 Unauthorized for unauthenticated clients) with explicit CORS origin matching.
- **Fail-Closed Basic Auth Middleware**: Enforces Basic Auth across all non-exempt endpoints. Automatically rejects all traffic with 503 if `BASIC_AUTH_PASSWORD` is missing in `.env`.
- **Hardened JWT Access Lifetime**: JWT access tokens are restricted to 60-minute lifetimes (`ACCESS_TOKEN_LIFETIME = timedelta(minutes=60)`) with 7-day refresh rotation.
- **Client-Side Auth Token Generation**: Password update flows generate auth tokens client-side to prevent credential leakage in HTTP response bodies.
- **Production Hardened**: HTTPS Security Headers (HSTS, secure cookies) enabled in production, and served via Daphne (strictly bound to `127.0.0.1` to prevent IP exposure).
- **Zero N+1 Query & OOM Guards**: Lead serialization includes full prefetching (`company_people`, `enrichments`, `email_drafts`) and unpaginated query guards (`max 500 leads`).
