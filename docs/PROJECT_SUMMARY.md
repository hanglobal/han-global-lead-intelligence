# RE Lead Intelligence — Complete Feature Summary

**What is this project?**
RE Lead Intelligence is a tool that helps you find potential business customers (specifically real estate businesses like agents, brokerages, and property managers), automatically collect their details from Google Maps, organize them in a tracking system, and guide your sales team through the process of turning those contacts into paying customers — from first discovery all the way to closing the deal.

---

## 1. Lead Hunter — Finding New Customers

### Create a Search Campaign
- You can create a **campaign** by specifying what type of business you're looking for (called a "niche", e.g. "real estate property management") and where (e.g. "Miami, FL").
- Each campaign gets a **unique ID** automatically (like CID-001, CID-002) so you can always find and refer to it.
- Campaign names are **automatically capitalized** for consistency.
- You can add an optional **description** to remember what the campaign is for.
- You can set a **maximum number of leads** you want to collect, or leave it blank to collect as many as possible.
- Three campaign types are available: **Google Maps**, **Web Scraper**, and **LinkedIn** (only Google Maps is currently configured and working).

### Run a Campaign
- When you hit the "Run" button, the system sends your search criteria to **Apify** (an external scraping service) which goes out and scrapes Google Maps for matching businesses.
- The campaign status changes from **Pending → Running → Completed** (or Failed if something goes wrong).
- A direct **link to the Apify run** is shown so you can view the scraping job in Apify's console.
- The system uses **two methods** to know when scraping is done:
  - **Webhook**: Apify calls back to the system instantly when finished (primary method).
  - **Polling fallback**: If the webhook doesn't arrive, the system checks every 30 seconds for up to 30 minutes.

### View Campaign Results
- Once a campaign finishes, you see how many **total businesses were found**, how many were **unique** (not duplicates), and how many were **synced to your CRM**.
- Each result shows the business name, address, phone, website, rating, review count, category, and whether it's been added to the CRM.
- The campaign detail view shows: niche, location, target lead count, creation date, last update date, total results count, and synced count.
- **Live Logs**: You can toggle a terminal-like view inside the campaign details to watch real-time events as the backend processes leads through Firecrawl, LLM, Apollo, and LinkedIn enrichment stages.

### Edit & Delete Campaigns
- You can **edit** any campaign's name, description, niche, location, and lead limit.
- You can **delete** a campaign with a confirmation dialog that warns "this cannot be undone" and that all scraped results will be permanently removed.

### Campaign Stats
- A summary bar shows how many campaigns are **Pending**, **Running**, **Completed**, and **Failed**.

---

## 2. Automated Import Pipeline — From Scraped Data to CRM

When a campaign finishes scraping, the raw data goes through a **4-step automated process** before entering your CRM:

### Step 1: Raw Backup
- **Every single scraped item** is saved as-is to a "CampaignResult" record — this is a full backup. Even if a business is a duplicate, the raw data is preserved. This means you never lose any scraped information.

### Step 2: Duplicate Removal
- The system checks for **duplicates within the same batch** (e.g. if the scraper found the same business twice).
- It also checks for **duplicates already in your CRM** (e.g. if you already have that business from a previous campaign).
- Only truly unique businesses pass through to the next step.

### Step 3: Create CRM Records
- For each unique business, a full **Lead record** is created in the CRM with all available details (name, phone, email, website, address, rating, reviews, social media links, etc.).
- The corresponding CampaignResult is **marked as "synced to CRM"** so you can track which raw results became actual leads.

### Step 4: Automatic Scoring
- All newly created leads are **automatically scored** in the background (see Lead Scoring section below).
- Scoring happens asynchronously so it doesn't block anything else.

---

## 3. CRM — Managing Your Leads

### Lead Pipeline (8 Stages)
Every lead goes through a sales pipeline with these stages:
1. **New** — Just discovered, no action taken yet
2. **Prospecting** — Starting to research or evaluate the lead
3. **Qualified** — Confirmed this is a good potential customer
4. **Contacted** — Reached out to them (call, email, etc.)
5. **Engaged** — They responded, ongoing follow-up
6. **Negotiation** — Discussing terms or proposal
7. **Won** — Deal closed successfully!
8. **Lost** — They're not interested or deal fell through

### Lead Scoring (0–100)
Each lead gets a **quality score** from 0 to 100 based on how much useful information is available:

- **Contact Information** (up to 30 points):
  - Has a phone number = 10 points
  - Has an email = 10 points
  - Has a website = 10 points

- **Business Details** (up to 40 points):
  - Has an address = 5 points
  - Has a street address = 5 points
  - Has a neighborhood = 5 points
  - Has a city = 5 points
  - Has a postal code = 5 points
  - Has a category = 5 points
  - Has a price level = 5 points
  - Has a Google Maps URL = 5 points

- **Ratings & Reviews** (up to 20 points):
  - Rating 4.5+ = 10 points, 4.0+ = 7, 3.0+ = 4, below 3 = 2
  - 100+ reviews = 10 points, 50+ = 7, 20+ = 5, 5+ = 3, below 5 = 1

- **Location Data** (up to 10 points):
  - Has latitude & longitude coordinates = 10 points

Each lead also gets a **score label**:
- **High** (score 70–100) — Great lead, lots of info
- **Medium** (score 40–69) — Decent lead, some info missing
- **Low** (score 0–39) — Minimal info, needs research

### Lead Classification
Leads can be classified into one of five business types:
- **Agent** — Individual real estate agent
- **Brokerage** — A brokerage firm
- **Investor** — Real estate investor
- **Property Mgmt** — Property management company
- **Developer** — Real estate developer

### Lead ID System
- Every lead gets a **unique ID** automatically (like LID-001, LID-002) for easy reference and tracking.
- IDs are generated sequentially and atomically (no two leads get the same ID).

### Lead Detail View
When you click on a lead, a detailed modal opens showing everything:

- **Lead Info**: Place ID, current status, classification
- **Contact**: Phone number, email address
- **Address**: Full address, street, neighborhood, city, postal code, coordinates with a clickable Google Maps link
- **Links**: Website, Google Maps page, Facebook, Twitter/X, Instagram, LinkedIn, YouTube — each with its own recognizable icon. Any additional social links from the scrape are also shown with appropriate icons.
- **Notes**: Any notes you've added
- **Tags**: Any tags you've assigned
- **Activity History**: A log of all status changes with descriptions and dates
- **CRM Signals**: Expandable section showing any CRM-related signals detected
- **Raw Apify Data**: Expandable section showing the complete original scraped JSON payload
- **Timestamps**: When the data was scraped, when the lead was created, when it was last updated

### Lead Search
- You can **search leads by name or address** using a search bar.

### Lead Filtering (10 Filter Types)
A collapsible filter panel lets you narrow down leads by:
1. **Status** — Select one or more pipeline stages (checkboxes for each of the 8 stages)
2. **Rating range** — Minimum and maximum rating (e.g. only show leads rated 4.0–5.0)
3. **Score range** — Minimum and maximum quality score
4. **Campaign** — Filter by campaign ID (type CID-001, etc., with auto-formatting)
5. **Review count range** — Minimum and maximum number of reviews
6. **Contact info** — "Has email" and/or "Has phone" checkboxes
7. **Category** — Select one or more business categories
8. **Source** — Select one or more lead sources (e.g. "gmap")
9. Active filter count is shown as a badge on the filter button
10. "Clear all" button to reset every filter at once

### Lead Table
- Leads are displayed in a table with columns: Name (with email underneath), Category, Phone, Rating (with review count), Status, Score.
- You can **select individual leads** with checkboxes or **select all** at once.
- Selected count is shown.
- Empty state shows "No leads found — try adjusting your filters".

### Bulk Actions
- **Bulk Score**: Click the lightning bolt icon to score all unscored leads. Progress is shown (how many scored, how many remaining). It keeps running until all leads are scored.
- **Export CSV**: Download all filtered leads as a CSV file with columns: name, category, phone, email, address, website, rating, review count, status. File is named with today's date.
- **Import Leads**: Upload a JSON or CSV file to add leads in bulk. The system:
  - Parses the file and maps field names (supports both your format and Apify's format)
  - Shows a **preview table** of the first 5 leads
  - Runs a **validation check** against the CRM to detect duplicates
  - Shows import stats: total in file, duplicates within the file, already in CRM, unique to import
  - Shows any errors (e.g. missing name)
  - You confirm to import only the unique leads
- **Bulk Delete**: Select multiple leads and delete them all at once with a confirmation dialog.

### Lead Status Updates
- You can change a lead's pipeline stage, and the system **automatically logs** the change as an activity entry (e.g. "Status changed to qualified").

### Lead Notes
- You can add or update notes on any lead.

### CRM Stats Bar
- A top bar shows counts for each pipeline stage: Total, New, Prospecting, Qualified, Contacted, Engaged, Negotiation, Won, Lost.

---

## 4. Dashboard — Analytics & Insights

### Time Range Selector
- You can switch between **4 time periods**: Last 24 Hours, Last 7 Days, Last 30 Days, Last 90 Days.
- All charts and numbers update based on the selected period.

### KPI Cards (4 Key Metrics)
1. **Total Leads** — How many leads are in the selected time period, with a **trend arrow** showing percentage change vs. the previous period (green for up, red for down).
2. **Average Score** — The average quality score of all scored leads, plus how many leads have a score of 70 or above.
3. **Win Rate** — Percentage of deals won out of total won+lost, with trend and breakdown (X won, Y lost).
4. **Data Quality** — Percentage of leads that have email and phone coverage, with exact counts (X with email, Y with phone).

### Charts (6 Visualizations)
1. **Leads Over Time** — Area chart showing how many new leads were captured each day in the selected period.
2. **Pipeline Distribution** — Donut/pie chart showing how leads are distributed across the 8 pipeline stages, with color coding and legend.
3. **Pipeline Funnel** — Horizontal bar chart showing the volume of leads at each pipeline stage, color-coded.
4. **Score Distribution** — Bar chart grouping leads into 5 score bands (0–19, 20–39, 40–59, 60–79, 80–100) with color coding from red (low) to green (high).
5. **Stage Conversion** — A list showing each pipeline stage with a progress bar, lead count, and **conversion percentage** from the previous stage (e.g. "30% of Prospecting leads became Qualified").
6. **Campaign Activity** — A 2×2 grid showing how many campaigns are Completed, Running, Pending, and Failed in the selected period.

### Bottom Sections
- **Top Categories** — The 5 most common business categories among your leads, with count and visual bar.
- **Top Sources** — The 5 most common lead sources, with count and visual bar.
- **Recent Leads** — The 5 most recently captured leads, showing name, contact info, score badge (color-coded), and status badge.
- **Quick Stats** — Unscored leads count, active campaigns count, completed campaigns count.

### Greeting & Date
- The dashboard shows a **time-based greeting** ("Good morning", "Good afternoon", or "Good evening") along with the current date.
- If there are leads, it says "X leads in pipeline"; otherwise "welcome back".

---

## 5. Real-Time Updates

### Server-Sent Events (SSE) Stream
- The frontend maintains a **persistent live connection** to the backend.
- When a campaign completes scraping or hits a new processing stage, the backend publishes **real-time events** (`CAMPAIGN_PROGRESS`, `CAMPAIGN_COMPLETED`, `CAMPAIGN_LOG`) via Redis.
- The SSE stream pushes these events to the frontend instantly.
- The frontend dispatches **custom browser events** which the UI listens to.
- The CRM page and the Lead Hunter page automatically refresh their data, and the **Live Logs** terminal appends new messages instantly without requiring a page refresh.

### Fallback Polling in Campaign Details
- When you run a campaign, the details view also starts a **local polling check** every 8 seconds, querying only the local database (not Apify) for status changes.
- This ensures the UI updates even if the SSE connection has issues.

---

## 6. Enrichment System & AI Insights

The system integrates with Firecrawl for web scraping and AI Models (Ollama/Claude) for data analysis:

### Lead Enrichment
- Stores: additional emails found, additional phones found, contact page URL, social links, whether the business **has a CRM system**, whether they have a **lead capture form**, whether they have a **saved search feature**, whether they have a **login portal**, and a **website quality score**.

### Lead Insights (AI)
- Stores: **pain points** (what problems the business might have), **operational gap** (what's missing in their operations), and **opportunity** (how you can help them).

### Lead Email Drafts (AI)
- Stores: **AI-generated personalized email drafts** with subject and body — these are drafts only, no sending capability. Multiple drafts can be stored per lead.

---

## 7. Navigation & Layout

### Sidebar
- A narrow icon-based sidebar on the left with 4 navigation items:
  - **Dashboard** (home icon) — Goes to the analytics dashboard
  - **CRM** (people icon) — Goes to the lead management system
  - **Lead Hunter** (search icon) — Goes to the campaign system
  - **Settings** (gear icon) — Goes to the settings page
- The currently active page is highlighted with a different color.
- Hover effects on all navigation items.

### URL-Based Navigation
- **CRM leads** are accessible via URLs like `/crm/LID-001` — when you click a lead, the URL updates so you can share or bookmark it.
- **Campaigns** are accessible via URLs like `/lead-hunter/CID-001` — selecting a campaign updates the URL.
- **Creating a campaign** updates the URL to `/lead-hunter/createcampaign`.
- **Editing a campaign** updates the URL to `/lead-hunter/CID-001/edit`.
- Browser back/forward buttons work correctly (popstate handling).

---

## 8. Settings Page

### API Configuration
- A field to enter your **Apify API key** (shown as a password field for security).
- A "Save key" button (UI is present, saving functionality not yet wired up).

### System Defaults
- **Default lead limit** — A dropdown to choose 50, 100, or 200 leads as the default for new campaigns.
- **Minimum rating filter** — A number input to set a default minimum rating (0–5).
- "Save defaults" button (UI is present, saving functionality not yet wired up).

---

## 9. Admin Panel (Backend)

### Leads Admin
- Search leads by name, address, phone, email.
- Filter by status, creation date, category.
- View lead activities inline.
- Columns shown: name, status, rating, review count, phone, created date.

### Campaigns Admin
- Search campaigns by name, niche, location.
- Filter by status, creation date.
- Columns shown: name, niche, location, lead count, status, created date.

### Campaign Results Admin
- Search results by name, address.
- Filter by synced-to-CRM status, creation date.
- Columns shown: name, campaign, rating, review count, synced status, created date.

### Enrichment Admin
- Search enrichments by lead name.
- Filter by has-CRM, has-lead-capture, has-saved-search.
- Columns shown: lead, has-CRM, has-lead-capture, website quality score, enriched date.

### Insights Admin
- Search insights by lead name, operational gap, opportunity.
- Columns shown: lead, generated date.

### Email Drafts Admin
- Search drafts by lead name, subject.
- Columns shown: lead, subject, created date.

---

## 10. Data Stored Per Lead

For every lead in the system, the following information is captured and stored:

| Category | Fields |
|----------|--------|
| **Identification** | Unique lead ID (LID-XXX), Place ID (from Google), internal database ID |
| **Basic Info** | Business name, category, classification (agent/brokerage/etc.), source (e.g. "gmap") |
| **Contact** | Phone, email, website URL |
| **Address** | Full address, street address, neighborhood, city, postal code |
| **Location** | Latitude, longitude (with clickable Google Maps link) |
| **Google Maps** | Google Maps URL, price level |
| **Ratings** | Star rating, number of reviews |
| **Social Media** | Facebook URL, Twitter/X URL, Instagram URL, LinkedIn URL, YouTube URL, plus a social_links object containing all social profiles as lists (Facebook, Instagram, LinkedIn, Twitter, YouTube, TikTok) |
| **Sales Pipeline** | Current status (8 stages), notes, tags |
| **Scoring** | Numeric score (0–100), score label (high/medium/low) |
| **Campaign Link** | Which campaign found this lead (campaign ID + direct reference) |
| **CRM Signals** | JSON field for any CRM-related signals detected |
| **Raw Data** | Complete original JSON payload from Apify scrape (never modified, always preserved) |
| **Timestamps** | When scraped, when created in system, when last updated |

---

## 11. Mock Data & Testing

### Seed Command
- A management command (`seed_mock_leads`) can generate **100 fake leads** for testing.
- Mock leads have: realistic business names (100 unique names like "Sunset Realty", "Coastal Properties"), random categories, ratings between 3.5–5.0, review counts between 10–500, random US addresses with real city/state combinations, phone numbers, email addresses, websites, and social media links (Facebook, Instagram, LinkedIn).
- Status distribution is weighted: 30% New, 25% Contacted, 20% Qualified, 15% Converted, 10% Lost.
- Skips any leads that already exist (won't create duplicates).

---

## 12. Deployment & Infrastructure

### Cloudflare Tunnel (Production)
- The system is configured to be accessible via the internet using a Cloudflare tunnel.
- **Frontend** is available at `apps.hgcrmsolutions.com` (routes to local port 5000).
- **API backend** is available at `apis-app.hgcrmsolutions.com` (routes to local port 5050).

### Service Management Scripts
- **`start-all.sh`** — One command to start everything: Redis, Celery worker, Django backend, Next.js frontend. Checks if services are already running, verifies virtual environments exist, creates default frontend config if missing.
- **`stop-all.sh`** — One command to stop everything gracefully. Uses PID files when available, falls back to process/port detection. Handles misplaced PID files from legacy runs.

### Database
- Uses **PostgreSQL** for all data storage (leads, campaigns, results, enrichments, insights, drafts).

### Background Processing
- **Redis** serves as both the Celery task broker and the real-time event pub/sub channel.
- **Celery** handles async tasks: lead scoring in batches of 100, Apify run polling every 30 seconds.

### API Configuration
- All configuration is managed through environment variables in a `.env` file.
- Supports: database connection, Apify API key, Apify actor IDs (per scraper type), Celery/Redis URLs, CORS origins, backend public URL.

---

## 13. UI Design Details

### Dark Theme
- The entire application uses a **dark theme** with a near-black background (#09090b), white text, and zinc-gray borders/cards.
- Custom **thin scrollbars** (5px width, dark gray, rounded).
- Number input spinners are hidden for cleaner appearance.
- Text selection highlights in blue.

### Reusable Design Components
- **Buttons**: Primary (indigo), Secondary (bordered), Ghost (transparent)
- **Cards**: Dark background with subtle border and shadow
- **Input fields**: Dark background, border, focus ring in indigo
- **Badges**: Rounded pill-shaped labels with borders
- **Section labels**: Small uppercase gray text
- **Table headers**: Small uppercase gray text

### Animations
- **Fade-in** animation for modals and panels
- **Slide-up** animation for filter sections
- **Spin** animation for loading indicators
- **Pulse** animation for loading placeholders
- Smooth **transition-all** on hover states (150ms duration)

### Modal Dialogs
- All modals have a **dark overlay** (70% black background).
- **Confirmation dialogs** for destructive actions (delete leads, delete campaigns) with warning icon, description, and Cancel/Delete buttons.
- **Import modal** with file upload area, preview table, validation stats, and import button.
- **Lead detail modal** with full information layout.
- **Campaign create/edit modals** with form fields.

---

## 14. What's NOT Yet Done

- **Settings saving** — The UI exists but doesn't actually save to the backend yet.
- **User authentication** — Using Django's built-in auth; no custom user model or login UI yet.