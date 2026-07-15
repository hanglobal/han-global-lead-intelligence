# Technology Stack

## Backend

### Core Framework
- **Django 4.2**: Python web framework
- **Django REST Framework 3.14+**: API serialization and viewsets
- **Python 3.10+**: Programming language

### Database
- **PostgreSQL 14+**: Relational database
- **psycopg2-binary 2.9+**: PostgreSQL adapter

### External Services
- **Apify Client 1.6+**: Google Maps scraping API
- **Requests 2.31+**: HTTP library for API calls

### Background Processing
- **Celery 5.3+**: Distributed task queue
- **Redis 5.0+**: Message broker and cache

### CORS Configuration
- **django-cors-headers 4.3+**: Cross-origin resource sharing support

### Environment & Configuration
- **python-dotenv 1.0+**: Environment variable management

### Production Server
- **Gunicorn 21.2+**: WSGI HTTP server

## Frontend

### Core Framework
- **Next.js 14.2**: React framework with App Router
- **React 18.2**: UI library
- **TypeScript 5.3+**: Type-safe JavaScript

### Styling
- **Tailwind CSS 3.4+**: Utility-first CSS framework
- **PostCSS 8.4+**: CSS processing
- **Autoprefixer 10.4+**: CSS vendor prefixing

### HTTP Client
- **Axios 1.6+**: Promise-based HTTP client

### Type Definitions
- **@types/node 20.10+**: Node.js type definitions
- **@types/react 18.2+**: React type definitions
- **@types/react-dom 18.2+**: React DOM type definitions

## UI/UX

### Design System
- **Dark Theme**: Slate color palette (slate-950, slate-800, slate-700, slate-600)
- **Primary Color**: Blue accent for actions
- **Status Colors**: Blue, Amber, Purple, Emerald, Rose for status badges
- **Transitions**: Smooth animations (200ms duration)
- **Hover Effects**: Interactive feedback on all clickable elements

### Components
- **Sidebar Navigation**: Collapsible with lightning icon toggle
- **Stat Cards**: Metric blocks with hover effects
- **Data Tables**: Dark-themed with row hover states
- **Forms**: Input fields with focus states
- **Status Badges**: Color-coded with transparent backgrounds

## Backend Apps

### Lead Hunter App
- **Campaign Model**: Campaign management (name, niche, location, lead_count, status)
- **CampaignResult Model**: Scraped lead results (place_id, name, address, rating, reviews)
- **Status States**: Pending, Running, Completed, Failed
- **API Endpoints**: Campaign CRUD, run campaign, list results

### CRM App
- **Lead Model**: Lead management (place_id, name, address, phone, email, rating, status)
- **LeadActivity Model**: Activity tracking (activity_type, description)
- **Status States**: New, Contacted, Qualified, Converted, Lost
- **API Endpoints**: Lead CRUD, list leads, activity tracking

## Version Requirements

| Component | Version |
|-----------|---------|
| Python | 3.10+ |
| Django | 4.2 |
| PostgreSQL | 14+ |
| Redis | 5.0+ |
| Node.js | 18+ |
| Next.js | 14.2 |
| React | 18.2 |
| TypeScript | 5.3+ |
| Tailwind CSS | 3.4+ |
