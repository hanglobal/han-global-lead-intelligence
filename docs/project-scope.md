# Han Global Lead Intelligence — Project Scope (`project_scope.md`)

## 1. Executive Summary & Vision

**Han Global Lead Intelligence** is an AI-powered enterprise Lead Intelligence and CRM platform built for high-touch B2B prospecting and sales automation. The system automates the complete lifecycle of lead acquisition: from targeted B2B decision-maker sourcing via **Nexus Data Solutions**, to deep website crawling via **Firecrawl**, AI-driven multi-stage qualification and consolidation, direct decision-maker **LinkedIn enrichment**, strategic sales insights, personalized cold email pitch generation, and actionable sales pipeline CRM execution.

---

## 2. Core Functional Modules & Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               HAN GLOBAL LEAD INTELLIGENCE                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
  │
  ├── 1. LEAD SOURCING & INGESTION (NEXUS DATA SOLUTIONS)
  │    ├── B2B Campaign Builder (Job Titles, Seniority, Industry, Size, Revenue, Location)
  │    ├── Primary Provider: Nexus Data Solutions API Client (`app.nexusdatasolutions.online`)
  │    ├── Direct Decision Maker + Contact Info Ingestion (Work Email, Personal Email, Mobile)
  │    ├── Celery Async 15s Status Polling + Webhook Dispatch
  │    └── Live Streaming Progress & Campaign Event Logs via SSE
  │
  ├── 2. OPTION 1 MULTI-STAGE ENRICHMENT PIPELINE
  │    ├── Stage 1: Nexus Ingestion & Intra-Batch Staging (`CampaignResult`)
  │    ├── Stage 2: Basic Qualification Filter (Website, Name, Direct Email/Mobile)
  │    ├── Stage 3: Firecrawl Deep Website Crawl (Home, About, Services, Team)
  │    ├── Stage 4: LLM Consolidation & ICP Qualification
  │    │           ├── If UNQUALIFIED ➔ Immediate CRM Sync (Skips downstream generation)
  │    │           └── If QUALIFIED ➔ Proceeds to Stage 4.5
  │    ├── Stage 4.5: Nexus LinkedIn People Profile & Posts Enrichment (`LINKEDIN` + `LINKEDIN_POST`)
  │    ├── Stage 5: AI Strategic Insights & Tailored Cold Email Pitch Generation (Using LinkedIn Posts)
  │    └── Stage 6: CRM Sync (Lead Account + Primary `CompanyPerson` + AI Scoring)
  │
  ├── 3. AI & INTELLIGENCE ENGINE
  │    ├── Dynamic Qualification Engine (Configurable via Settings Panel)
  │    ├── Dynamic AI Lead Scoring (0–100 Scale, Hot / Warm / Cold labels)
  │    ├── Strategic Insights (Pain Points, Operational Gaps, Value Opportunities)
  │    └── Automated Personalized Cold Outreach Pitch Generation (<150 words)
  │
  ├── 4. FINANCIAL & OPERATIONAL ANALYTICS SUITE
  │    ├── Real-Time Nexus Prepaid Balance Widget ($45.50 USD)
  │    ├── Campaign-by-Campaign Sourcing Spend Breakdown Table ($15/1k leads)
  │    ├── Cost per Lead & Cost per Qualified Lead Analytics
  │    └── Sourcing-to-Outreach Conversion Funnel & Pipeline Velocity
  │
  ├── 5. CRM & PIPELINE LIFECYCLE MANAGEMENT
  │    ├── Sequential Atomic IDs (`LID-1`, `LID-2`, `CID-1`, `CID-2`)
  │    ├── Sales Pipeline Stages (New, Qualified, Contacted, Meeting, Won, Lost, Unqualified)
  │    ├── Multi-Contact Entity Support (`CompanyPerson` per Lead)
  │    ├── Comprehensive Lead Audit Logs & Activity History
  │    ├── Advanced Filtering (Status, Score, Category, Campaign, Direct Contact)
  │    └── Sequential Collapsible Lead View Modal (5 Standardized Dropdown Sections)
  │         ├── 1. Company & Firmographics (Metric Strip, Tech Stack, Summary, Links)
  │         ├── 2. Decision Maker & Direct Contacts (Executive Banner, Contacts, LinkedIn Posts)
  │         ├── 3. AI ICP Intelligence & Qualification (Checklist, Strategic Insights)
  │         ├── 4. AI Cold Outreach Pitch (Subject, Body, 1-Click Copy & Email Client)
  │         └── 5. Notes & Activity Timeline (Quick Note Input, Activity Audit Feed)
  ├── 6. SALES ACTION LAYER & CLIENT BUCKET ENGINE (`/sales`)
  │    ├── Client Phase 1 Specification Alignment (`docs/Han_Global_Dashboard_Enhancement_Brief_Final.docx`)
  │    ├── 4 Priority Action Buckets:
  │    │    ├── 1. Send Today (Contact-ready accounts with verified emails & decision makers)
  │    │    ├── 2. Follow-Up Today (Scheduled follow-ups due today + overdue touches)
  │    │    ├── 3. Meetings & Active Deals (Booked demos, proposals sent, in-flight deals)
  │    │    └── 4. Needs Research (High-fit accounts missing direct decision maker or email)
  │    ├── Dynamic "Why Now" Sales Brief Synthesis & Service Recommendation Hook
  │    ├── 1-Click AI Cold Email Pitch Preview & Copy
  │    ├── Interactive Follow-Up Scheduler (`ScheduleFollowUpModal`)
  │    ├── Sales Touch Activity Logger (`LogOutreachModal` for Calls, Emails, Meetings)
  │    └── Collapsible Operational Health & Pipeline Opportunities Drawer
  │
  ├── 7. STRICT SOLO-ADMIN GOVERNANCE & SECURITY
  │    ├── Single Root Administrator Architecture (`admin`)
  │    ├── Elimination of Multi-User Roles, Team Permissions, and Tenant Redundancy
  │    ├── Context-Bound Profile & Password Management (`request.user`)
  │    ├── Protected Real-Time SSE Stream (401 Unauthorized for Public Access)
  │    └── Strict Browser Session Enforced (`reli_session_active`)
  │
  ├── 8. ULTRA-PREMIUM MINIMAL MONOCHROMATIC DESIGN SYSTEM
  │    ├── Dark Matte Zinc Palette (`#09090b`, `#18181b`, `#27272a`) inspired by Linear & Raycast
  │    ├── Complete Elimination of Rainbow Gradients, Saturated Neon Pills, and Loud Borders
  │    ├── Muted Micro-Dot Status & Lead Score Indicators (Hot, Warm, Cold)
  │    ├── High-Contrast Crisp Monochrome Typography & White Action Buttons
  │    └── Subtle 1px Neutral Borders and Micro-Animations
  │
  └── 9. REAL-TIME INFRASTRUCTURE & ORCHESTRATION
       ├── Celery Distributed Task Queue with Granular Task Handlers
       ├── Celery Beat Automated Scheduler for Continuous Sourcing & Health Polling
       ├── Redis Rate-Limit Locking (e.g., Firecrawl 10 req/min compliance)
       ├── SSE (Server-Sent Events) for Live Status & Terminal Logs
       └── Cloudflare Tunneling for Webhooks & Remote Ingestion
```

---

## 3. Detailed Module Specifications

### Module 1: Lead Hunter & Sourcing (Nexus Data Solutions)
- **Primary Engine**: Nexus Data Solutions B2B API (`/api/v1/campaigns/run/`, `/api/v1/campaigns/{id}/leads/`).
- **Dynamic B2B Filters**: Allows targeting by `contact_job_title`, `seniority_level` (C-Suite, VP, Director, Owner), `company_industry`, `size`, `company_domain`, `company_keywords`, `contact_location`, and validated email status.
- **Minimum 250 Lead Hard Enforcement**: Campaigns enforce a strict minimum of 250 leads on both frontend modal and backend API views (`lead_count = max(250, ...)`), with auto-snapping on input blur and client-configurable higher maximums.
- **Unique Identifier**: Auto-assigns monotonic sequential `CID-N` identifiers.
- **Asynchronous Polling & Error Traps**: Celery task `poll_nexus_campaign_run` polls the Nexus API every 15s until `status == 'COMPLETED'`, retries transient download failures automatically, saves delivered leads, and records the billed spend amount.

### Module 2: Option 1 Multi-Stage Pipeline Execution
- **Stage 1 (Nexus Ingestion)**: Ingests decision-maker name, work email, personal email, mobile phone, LinkedIn, company description, tech stack, funding, and revenue into `CampaignResult.raw_data`.
- **Stage 2 (Basic Qualification)**: Checks website existence, decision-maker name, direct contact info (email/personal email/mobile), and LinkedIn URL. Persists exact failure criteria into `qualification_reasoning`.
- **Stage 3 (Firecrawl Web Scrape)**: Crawls the company website with 2-worker concurrency and an optimized 8-second buffer complying with Firecrawl's 10 req/min limit. Includes rate-limit shock absorber (90s pause) and loop continuation for empty websites.
- **Stage 4 (LLM Consolidation & Qualification)**: 3-Tier AI consolidates data and evaluates against ICP settings. Unqualified leads are synced immediately to CRM as `unqualified` with AI reasoning.
- **Stage 4.5 (Smart LinkedIn Deduplication & Enrichment)**:
  - *Layer 1*: In-memory inspection of current lead.
  - *Layer 2*: O(1) indexed lookup in `LinkedInProfileCache`. If cached, reuses verified profile & posts data without contacting Nexus, saving $0.009 USD per lead.
  - *Layer 3*: Dispatches to Nexus `LINKEDIN` ($6/1k) and `LINKEDIN_POST` ($3/1k) services only for genuinely new profiles. Automatically caches completed results for future campaigns.
- **Stage 5 (AI Insights & Email Draft)**: Ingests company profile, website crawl markdown, and decision-maker LinkedIn posts/bio to generate 3 strategic insights (Pain Points, Operational Gap, Opportunity) and a bespoke cold outreach email pitch.
- **Stage 6 (CRM Sync & Scoring)**: Creates `Lead` (`LID-N`), links `CompanyPerson` (Primary Decision Maker with headline, title, and LinkedIn fallbacks), generates idempotent `LeadInsight` and `LeadEmailDraft` (via `update_or_create`), and triggers dynamic AI lead scoring (0–100).
- **Atomic Campaign Completion**: Utilizes PostgreSQL row-level locking (`select_for_update`) to prevent duplicate completion events under concurrent workers.

### Module 3: Dynamic Settings & 3-Tier AI Intelligence
- **3-Tier AI Resilience Engine (`AIClient`)**:
  - *Tier 1 (Primary)*: `glm-5.3:cloud` via Ollama Cloud API (`https://ollama.com/api/generate`).
  - *Tier 2 (Secondary Backup)*: `minimax-m3:cloud` via Ollama Cloud API.
  - *Tier 3 (Final Failover)*: Anthropic Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`).
  - *Resilient JSON Parsing*: Regex-assisted extractor safely isolates `{...}` objects from thinking tokens and markdown fences.
- **AI Qualification Settings**: Configurable from `/settings/` panel:
  - Toggles for `require_website`, `require_name`, `require_direct_contact`, `require_linkedin`.
  - Editable ICP Prompt (`agency_services`).
  - Dynamic AI Scoring Rules (`scoring_rules`).
  - Insight Generation Rules (`insight_generation_rules`).
  - Cold Email Pitch Rules (`email_generation_rules`).

### Module 4: Financial & Billing Analytics
- **Live Account Balance**: Real-time sync with Nexus prepaid account ($45.50 USD).
- **Campaign Cost Tracking**: Records exact `billed_amount` per extraction campaign.
- **Cost Efficiency Metrics**: Tracks cost per ingested lead ($0.015) and cost per qualified lead.

### Module 5: Sales Action Layer & Client Bucket Engine (`/sales`)
- **Action Bucket 1: Send Today**: Leads with AI score >= 70, verified decision-maker email, and no outreach logged yet.
- **Action Bucket 2: Follow-Up Today**: Accounts where `follow_up_date <= TODAY` and `follow_up_status != 'completed'`. Includes overdue alert counter.
- **Action Bucket 3: Meetings & Deals**: Accounts in stages `meeting_booked`, `proposal_sent`, or `in_discussion`.
- **Action Bucket 4: Needs Research**: Accounts qualified by ICP but lacking verified decision maker or direct email.
- **Dynamic "Why Now" Sales Brief**: Synthesized on-the-fly from employee headcount, revenue estimates, sector, and identified operational pain points.
- **Touch & Lifecycle Logging**: Integrated modal endpoints (`/log-outreach/`, `/schedule-followup/`, `/complete-followup/`) allowing instantaneous stage progression without CRM friction.

### Module 6: Solo-Admin Governance & Security Model
- **Single Root Administrator**: Entire application operates under a single administrative identity (`admin`).
- **Elimination of Multi-User Complexity**: Purged multi-user role tables, team access lists, and tenant boundaries.
- **Authenticated Event Stream**: Real-time SSE endpoint `/api/lead-hunter/stream/` is strictly guarded by BasicAuth/session validation.
- **Strict Session Lock**: Enforces `reli_session_active` tab-level validation; unauthenticated requests are automatically terminated.

### Module 7: Ultra-Premium Minimal Monochromatic Design System
- **Color Discipline**: Crafted around a restrained palette of deep matte zinc (`#09090b`, `#18181b`, `#27272a`), subtle 1px border lines (`#27272a`), and high-contrast white typography (`#fafafa`).
- **No Rainbow Overload**: Replaced colored card fills and neon status badges with clean micro-dot indicators and dark zinc tags.
- **Action Buttons**: Unified, high-contrast monochrome buttons (`bg-white text-zinc-950 hover:bg-zinc-200`) providing immediate visual clarity and tactile responsiveness.

### Module 8: CRM Lead View Sequential Accordion Architecture
- **Standardized Sequential Information Flow**: Replaces fragmented card grids with 5 sequential, collapsible dropdown accordion sections:
  1. `Company & Firmographics`: Headcount, annual revenue, funding, founded year, tech stack tags, website AI summary, address, and social links.
  2. `Decision Maker & Direct Contacts`: Full executive profile, C-Suite badge, verified phones/emails, bio, and live LinkedIn posts feed with timestamps and direct links.
  3. `AI ICP Intelligence & Qualification`: AI qualification status banner, pass/fail verification checklist, 3-card strategic insights (Pain Points, Operational Gap, Strategic Opportunity), and industry tags.
  4. `AI Cold Outreach Pitch`: Target recipient callout, subject line with 1-click copy, personalized email body with 1-click copy and direct mail client launch (`mailto:`).
  5. `Notes & Activity Timeline`: Inline note addition, multi-note history, and full CRM audit trail of touchpoints, enrichment events, and status transitions.
- **Enterprise Interaction Patterns**:
  - Independent section collapse/expand toggling with default-open state (`isOpen: true`) for comprehensive overview.
  - Hairline dividers (`border-b border-zinc-800/50`) eliminating bulky nested card containers.
  - 100% scalable SVG icons replacing informal emojis across all headers, metrics, and actions.

