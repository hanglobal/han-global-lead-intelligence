# Han Global Lead Intelligence — Project Scope (`project_scope.md`)

## 1. Executive Summary & Vision

**Han Global Lead Intelligence** is an AI-powered enterprise Lead Intelligence and CRM platform built for high-touch B2B prospecting and sales automation. The system automates the complete lifecycle of lead acquisition: from targeted web scraping and deep data extraction, to AI-driven multi-stage qualification, contact enrichment, personalized insight generation, and actionable sales pipeline execution.

---

## 2. Core Functional Modules

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               HAN GLOBAL LEAD INTELLIGENCE                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
  │
  ├── 1. LEAD HUNTER & SOURCING
  │    ├── Campaign Builder (Niche, Location, Max Leads, Actor Type)
  │    ├── Google Maps Scraping via Apify Actor (`nwua9Gu5YrADL7ZDj`)
  │    ├── Future Transition / Direct Ingestion: Nexus Data Solutions
  │    ├── Webhook Event Dispatch + Celery 30s Polling Fallback
  │    └── Live Streaming Progress & Campaign Event Logs via SSE
  │
  ├── 2. MULTI-STAGE ENRICHMENT PIPELINE
  │    ├── Stage 1: Raw Backup & Deduplication (`place_id` & domain checks)
  │    ├── Stage 2: Firecrawl Deep Website Crawl (Home, About, Contact, Team)
  │    ├── Stage 3: LLM Data Consolidation & Initial Qualification Check
  │    ├── Stage 4: Apollo.io Organization & Decision-Maker Enrichment
  │    ├── Stage 5: Apify LinkedIn Profile Scraping
  │    └── Stage 6: AI Insights Generation & Custom Cold Outreach Drafting
  │
  ├── 3. AI & INTELLIGENCE ENGINE
  │    ├── Dynamic Qualification Engine (Configurable via UI settings)
  │    ├── Rule-Based & AI Lead Scoring (0–100 Scale, Hot / Warm / Cold labels)
  │    ├── Strategic Insights (Pain Points, Operational Gaps, Value Opportunities)
  │    └── Automated Personalized Email Pitch Generation (<150 words)
  │
  ├── 4. CRM & PIPELINE LIFECYCLE MANAGEMENT
  │    ├── Sequential Atomic IDs (`LID-1`, `LID-2`, `CID-1`, `CID-2`)
  │    ├── Sales Pipeline Stages (New, Qualified, Contacted, Meeting, Won, Lost, Unqualified)
  │    ├── Multi-Contact Entity Support (`CompanyPerson` per Lead)
  │    ├── Comprehensive Lead Audit Logs & Activity History
  │    └── Advanced Filtering (Status, Score, Reviews, Rating, Category, Campaign)
  │
  ├── 5. SALES ACTION CENTER (PRIORITIZATION LAYER)
  │    ├── **SEND TODAY**: Contact-ready leads with verified decision-maker emails
  │    ├── **FOLLOW UP TODAY**: Overdue and scheduled prospect touchpoints
  │    ├── **MEETINGS / OPPORTUNITIES**: Active sales conversations and pipeline deals
  │    ├── **NEEDS RESEARCH**: High-fit target companies missing verified direct contacts
  │    └── **Ranked Priority Lead List**: Executive sales brief per account
  │
  └── 6. REAL-TIME INFRASTRUCTURE & ORCHESTRATION
       ├── Celery Distributed Task Queue with Granular Task Handlers
       ├── Redis Rate-Limit Locking (e.g., Firecrawl 10 req/min compliance)
       ├── SSE (Server-Sent Events) for Live Status & Terminal Logs
       └── Cloudflare Tunneling for Webhooks & Remote Ingestion
```

---

## 3. Detailed Module Specifications

### Module 1: Lead Hunter & Sourcing
- **Campaign Configuration**: Create targeted searches defining `niche`, `location`, `actor_type`, and `lead_count`.
- **Unique Identifier**: Auto-assigns monotonic sequential `CID-N` identifiers.
- **Scraper Execution**: Dispatches asynchronous scraping tasks to Apify actors (Google Maps actor).
- **Dual Completion Mechanism**: Listens for incoming webhook payloads at `/api/lead-hunter/webhook/apify/` and runs a 30-second fallback polling task via Celery.
- **Nexus Data Solutions Integration**: Prepares the ingestion architecture to accept bulk pre-enriched data batches from local provider Nexus Data Solutions.

### Module 2: Multi-Stage Automated Enrichment Pipeline
- **Raw Backup**: Preserves full untouched JSON payloads in `CampaignResult` records.
- **Intra-Batch & DB Deduplication**: Validates uniqueness across both current batch and existing database records using `place_id` and domain.
- **Firecrawl Website Crawler**: Crawls company websites for targeted pages (`/about`, `/contact`, `/team`, `/services`), with global concurrency locks to honor external API rate limits.
- **Apollo.io Contact Search**: Queries Apollo API by domain to retrieve organization data and employee lists, identifying primary decision-makers (Founders, Owners, C-Suite, Directors).
- **LinkedIn Profile Enrichment**: Scrapes LinkedIn profile data for identified decision-makers.

### Module 3: AI Intelligence Engine
- **LLM Data Extraction**: Merges raw Google Maps and scraped website markdown into clean, standardized company attributes.
- **AI Qualification**: Evaluates business fit against dynamic qualification settings; rejects unviable leads with explanatory reasoning (`qualification_reasoning`).
- **Strategic Business Insights**: Automatically generates 3 in-depth analytical perspectives:
  1. *Pain Points*: Industry-specific business challenges.
  2. *Operational Gap*: Deficiencies in their existing technology or operational setup.
  3. *Opportunity*: Strategic angles to pitch Han Global's services.
- **Personalized Email Drafting**: Produces tailored, ready-to-send cold outreach copy based on the extracted insights.
- **Lead Scoring**: Computes a 0–100 quality score and assigns status labels (`Hot`, `Warm`, `Cold`).

### Module 4: CRM Core & Pipeline Management
- **Centralized Lead Directory**: Displays full profile, company contacts, scraped metadata, activity history, and CRM signals.
- **Contact Management (`CompanyPerson`)**: Supports multiple contacts per organization, marking primary decision-makers and storing direct emails, direct phone numbers, and LinkedIn URLs.
- **Lead Pipeline Stages**: Tracks leads through defined pipeline statuses (`new`, `qualified`, `contacted`, `meeting`, `won`, `lost`, `unqualified`).
- **Activity & History Logs**: Automatically logs status modifications, qualification notes, import events, and outbound communications.
- **Bulk Data Tools**: Supports CSV/JSON lead import with duplicate validation and filtered CSV exports.

### Module 5: Sales Action Center & Prioritization
- **Action Blocks**:
  - *SEND TODAY*: High-priority qualified leads ready for first contact.
  - *FOLLOW UP TODAY*: Leads requiring timely follow-up.
  - *MEETINGS / OPPORTUNITIES*: Active discussions and proposals.
  - *NEEDS RESEARCH*: Target accounts missing contact details.
- **Ranked Priority Lead Table**: Displays high-level sales briefs (Company & Decision-Maker, Why Now, Recommended Service, Next Action, Sales Status).

### Module 6: Real-Time Infrastructure & Event Streaming
- **Server-Sent Events (SSE)**: Streams live progress updates and terminal logs from backend workers directly to the Next.js frontend.
- **Celery Task Pipeline**: Orchestrates decoupled, resilient tasks (`campaign_scrape_stage_task`, `process_single_lead_task`, `poll_apify_run`).
- **Rate-Limiting & Task Guards**: Employs Redis locks and sleeping intervals to avoid third-party rate limits.

---

## 4. Database Schema & Architecture Overview

| Model | Table | Purpose |
|---|---|---|
| `Campaign` | `lead_hunter_campaigns` | Search campaign metadata, stage, status, total leads found (`CID-N`) |
| `CampaignResult` | `lead_hunter_results` | Raw scraped payload backup, stage flags, Firecrawl & AI cleaned JSON |
| `CampaignLog` | `lead_hunter_campaign_logs` | Real-time campaign event audit trail and terminal log storage |
| `Lead` | `crm_leads` | Production CRM lead records with contact, scores, and status (`LID-N`) |
| `CompanyPerson` | `crm_company_people` | Decision-makers and contact persons linked to a Lead |
| `LeadActivity` | `crm_lead_activities` | Historical audit logs for lead status changes and notes |
| `LeadQualificationSettings` | `crm_lead_qualification_settings` | Dynamic agency settings, scoring thresholds, and prompt guidelines |
| `LeadEnrichment` | `enrichment_lead_enrichment` | Raw web scrape content and scraper identifiers |
| `LeadInsight` | `enrichment_lead_insight` | Stored AI business insights (pain points, gaps, opportunities) |
| `LeadEmailDraft` | `enrichment_lead_email_draft` | Tailored AI email drafts for prospect outreach |

---

## 5. System Boundaries & External Integrations

- **Apify API**: Google Maps scraping actor (`nwua9Gu5YrADL7ZDj`) & LinkedIn scraper actor.
- **Firecrawl API**: Web crawling and markdown content extraction.
- **Apollo.io API**: Organizational and employee contact enrichment.
- **Ollama / Anthropic Claude API**: LLM extraction, qualification filtering, insights, and email drafting.
- **PostgreSQL & Redis**: Relational data persistence, task brokering, and live pub/sub messaging.
- **Cloudflare Tunnel**: Secure inbound webhook endpoint for production/staging communication.
