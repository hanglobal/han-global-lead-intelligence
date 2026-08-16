# Han Global Lead Intelligence — AI Agent & Developer Guidelines (`agent.md`)

This document defines the core engineering standards, architectural rules, coding practices, and operational workflows for AI agents and developers working on the **Han Global Lead Intelligence** codebase.

---

## 1. Project Overview & Architecture Principles

- **Project Core**: Han Global Lead Intelligence is an end-to-end B2B Lead Intelligence, Enrichment, and CRM platform designed to source prospects, perform deep website extraction, enrich decision-maker profiles, generate AI insights & personalized outreach emails, and power internal sales execution.
- **Backend**: Python 3.12, Django 4.2+, Django REST Framework, Celery 5+ (distributed tasks), Redis (caching, message broker, and SSE pub/sub), PostgreSQL.
- **Frontend**: Next.js 14+ (App Router), React 18, TypeScript, TailwindCSS / Vanilla CSS, Server-Sent Events (SSE).
- **External Integrations**: Apify (Google Maps scraper), Firecrawl (website deep crawl & markdown extraction), Apollo API (contact & organizational enrichment), Ollama & Anthropic Claude (LLM extraction, decision maker identification, insights, and email draft generation).

---

## 2. General Engineering Rules

1. **Maintain Clean Code & Type Safety**:
   - Backend: Follow PEP 8 standards, write explicit type hints where feasible, use structured logging with Python's standard `logging` module.
   - Frontend: Strictly type all props, state, and API responses using TypeScript interfaces. Avoid `any` types.
2. **Never Break Backward Compatibility**:
   - Maintain consistency in serialized model fields (`_serialize_lead()` in `crm/views.py`).
   - Retain legacy helpers or fields (e.g., `_make_lid()`, `_make_campaign_id()`) if required for migration stability.
3. **No Destructive Database Changes**:
   - Never reset migrations or drop tables unless explicitly instructed.
   - Always create non-destructive, additive migrations (`python manage.py makemigrations`).
4. **Resilient Error Handling**:
   - Every external network call (Apify, Firecrawl, Apollo, Ollama, Claude) must be wrapped in `try/except` blocks with appropriate fallbacks, retries, or clear error state flags.
   - Avoid silent failures; persist error descriptions to campaign logs or lead reasoning fields.

---

## 3. Backend Rules & Best Practices

### 3.1 Django Models & Identifiers
- **Strictly Sequential IDs**:
  - `Lead.lid` must follow the format `LID-{sequential count}` (e.g. `LID-1`, `LID-42`).
  - `Campaign.campaign_id` must follow `CID-{sequential count}` (e.g. `CID-1`, `CID-7`).
  - Generated automatically on model creation using `objects.count() + 1`.
- **Database Indexing & Field Optimization**:
  - Always add `db_index=True` for frequently queried search/filter fields (e.g., `place_id`, `campaign_id`, `status`).
  - Use `JSONField` for raw scrapings and flexible payloads (`raw_data`, `firecrawl_raw_data`, `ai_clean_data`).

### 3.2 Celery & Background Task Patterns
- **Asynchronous Execution for Heavy Work**:
  - Web scraping, LLM consolidation, Apollo enrichment, and bulk scoring must NEVER run synchronously inside HTTP request cycles.
  - Dispatch tasks using `.delay()` or `.apply_async()`.
- **Concurrency & Rate Limit Guards**:
  - Respect external provider rate limits (e.g., Firecrawl 10 requests/min). Use global Redis locks (`cache.add("global_firecrawl_lock", "locked", timeout=75)`) and appropriate backoff delays.
- **Single-Lead Pipeline Isolation**:
  - When processing leads asynchronously, use granular tasks like `process_single_lead_task(cr_id)` so individual lead failures do not block an entire campaign.
- **Stage Progression & Limbo Prevention**:
  - Always update `qualification_status` and stage flags (`is_llm_processed`, `is_apollo_processed`, `is_insights_processed`, `is_crm_synced`).
  - If a lead fails qualification at any stage, immediately mark it as `unqualified`, sync to CRM, and invoke `check_campaign_completion()`.

### 3.3 Real-Time SSE (Server-Sent Events) & Redis Pub/Sub
- **Event Broadcasting**:
  - Use `publish_campaign_progress(campaign)` and `log_campaign_event(campaign, message, level)` in `apps/lead_hunter/views.py`.
  - Redis channel `CAMPAIGN_UPDATES` and `CAMPAIGN_LOG` stream real-time events to the `/api/lead-hunter/stream/` endpoint.
- **Keep Event Payloads Lightweight**: Send status updates, percentages, and log strings. Do not transmit bulk binary or massive HTML payloads via SSE.

---

## 4. Frontend Rules & Conventions

### 4.1 Component Structure & State
- **Self-Contained Components**:
  - Panels (e.g., `DashboardPanel`, `CampaignDetails`, `LeadView`) should encapsulate their own API data fetching and state when appropriate.
- **Responsive & Dark-Themed UI**:
  - Maintain the sleek, dark-themed dashboard aesthetics.
  - Use high-contrast text, clear status badges (e.g., Green for Qualified, Red for Unqualified, Yellow for Running), and smooth micro-animations.
- **Live Event Handling**:
  - Setup SSE EventSource listeners inside `useEffect` with proper cleanup routines (`eventSource.close()`) to avoid memory leaks.

### 4.2 API Calls & Serialization
- Always use the unified API base URL configured in `.env` (`NEXT_PUBLIC_API_URL`).
- All lead responses follow the standard `Lead` schema returned by `crm/views.py`. Note: use `company_email` for lead contact info.

---

## 5. AI & LLM Processing Guidelines

### 5.1 Dynamic Qualification & Scoring Rules
- Read rules dynamically from `LeadQualificationSettings` singleton table.
- AI tasks should handle:
  1. **Consolidation**: Clean and merge raw Google Maps data and Firecrawl website scrapes into structured JSON (`ai_clean_data`).
  2. **Decision Maker Selection**: Parse Apollo employee lists to identify key decision makers (CEOs, Founders, Directors).
  3. **Strategic Insights**: Generate 3 core insights (Pain Points, Operational Gaps, Strategic Opportunity).
  4. **Cold Outreach Drafting**: Generate concise (<150 words), hyper-personalized email drafts based on the insights.

### 5.2 Model Fallbacks & Token Efficiency
- Use Ollama as primary local LLM when configured, with Anthropic Claude API as high-reliability fallback.
- Truncate excessively long webpage texts before passing to LLM prompts to prevent token exhaustion and slow latency.

---

## 6. Development & Deployment Workflows

- **Start Services**: Use `./start-all.sh` (or manage Django, Celery worker, Redis, Next.js, and Cloudflare tunnel services).
- **Stop Services**: Use `./stop-all.sh`.
- **Tunneling**: Cloudflare tunnel connects local dev/prod server (`https://apis-app.hgcrmsolutions.com`) for receiving external webhooks (e.g., Apify).
