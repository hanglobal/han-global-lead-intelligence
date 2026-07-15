# Real Estate Lead Intelligence

A web application for hunting high-quality real estate leads using Google Maps data via Apify API.

## Overview

This application allows users to:
- Create campaigns targeting specific niches and locations
- Fetch high-quality leads from Google Maps
- Manage leads in a custom CRM
- Track lead status and activity

## Tech Stack

- **Backend**: Python Django
- **Frontend**: Next.js 14
- **Database**: PostgreSQL
- **External API**: Apify (Google Maps Scraper)

## Quick Start

1. Set up the backend:
   ```
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your settings
   python manage.py migrate
   python manage.py runserver
   ```

2. Set up the frontend:
   ```
   cd frontend
   npm install
   cp .env.example .env.local
   npm run dev
   ```

3. Access the application at http://localhost:3000

## Documentation

- `overview.md` - Project overview and requirements
- `architecture.md` - System architecture
- `techstacks.md` - Technology stack details
- `setup.md` - Detailed setup instructions
- `changes.md` - Change log

## Project Structure

```
backend/
  apps/
    lead_hunter/    - Campaign management
    crm/            - Lead management
  config/           - Django configuration

frontend/
  src/
    app/            - Next.js pages
    components/     - React components
```
