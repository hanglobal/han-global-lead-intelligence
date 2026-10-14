# Han Global Lead Intelligence — AI Agent & Developer Guidelines (`agent.md`)

**MANDATORY INSTRUCTION:** Every developer or AI agent working on this codebase MUST read and strictly follow this document before making any changes. 

---

## 1. Project Tech Stack
The project strictly uses the following technologies. Do not introduce alternative frameworks unless explicitly approved.
- **Backend:** Python 3.12, Django, Daphne (ASGI), Celery, Redis, PostgreSQL.
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS.
- **Real-time:** Server-Sent Events (SSE).

## 2. External Integrations
- **Nexus Data Solutions:** B2B prospect data ingestion, LinkedIn profile scraping, and LinkedIn post scraping.
- **Firecrawl:** Deep website crawling and markdown extraction.
- **AI/LLMs:** Ollama (Primary local/cloud LLMs) and Anthropic Claude (Failover). *(Note: Google Gemini is NOT used in this project).*

## 3. Frontend Architecture (Next.js)
- **Component Modularity:** Every panel (e.g., `/crm`, `/sales`, `/settings`) must have its own dedicated `components/` folder. 
- **Page Assembly:** All complex UI elements must be broken down into individual components inside the `components/` folder, which are then imported and assembled in the panel's root `page.tsx`. 
- **Goal:** Keep `page.tsx` clean and lightweight. Prevent massive monolithic files so that individual components can be easily scaled, modified, or removed in the future.
- **UI/UX:** Keep the design minimal, professional, and strictly adhere to the established monochromatic dark theme.

## 4. Code Quality & Standards
- **Industry-Grade Code:** Write clean, professional, and industry-grade code. No messy or hacky workarounds.
- **Professional Commenting:** Add comments only where logic is complex or necessary. Avoid over-commenting (e.g., do not write 40 lines of comments for 50 lines of code).
- **No Emojis:** Strictly avoid unnecessary emojis in the codebase, comments, or UI headers.
- **Dead Code Elimination:** If a feature is removed or replaced, you must immediately find and delete all its associated unused code, duplicate logic, and references across the entire codebase. Leave no trace of deprecated features.

## 5. Server Management
- **Start/Stop Scripts:** Always use the dedicated scripts `./start-all.sh` and `./stop-all.sh` to manage services. 
- **Restriction:** Never attempt to start or stop services manually via direct port binding or raw commands.

## 6. Documentation Workflow
- **Pre-Work Phase:** Before starting any new task, you must read all project documentation to understand the context.
- **Post-Work Phase (Progress Tracking):** After completing a task, you must update the `docs/progress.md` file.
  - Updates must be structured by **Phase** or **Session**.
  - Include the exact **Date and Time Stamp**.
  - Include the **Task Title**.
  - Provide a concise **1-2 line summary** explaining exactly what was accomplished in that task.
- **Doc Separation:** 
  - `agent.md`: Contains ONLY project-specific rules, architecture guidelines, and coding standards. No fluff.
  - `project-scope.md`: Contains the actual scope, features, and requirements of the project.
  - `progress.md`: Tracks the chronological history of completed work.
