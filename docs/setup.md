# Setup Instructions

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis 5.0+ (for Celery background tasks)

## Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your database and API credentials
   ```

5. Set up PostgreSQL database:
   ```bash
   createdb realestate_leads
   ```

6. Run database migrations:
   ```bash
   python manage.py migrate
   ```

7. Create admin user:
   ```bash
   python manage.py createsuperuser
   ```

8. Start Redis server (required for Celery):
   ```bash
   redis-server
   ```

9. Start Celery worker (in a separate terminal):
   ```bash
   cd backend
   source .venv/bin/activate
   celery -A config worker -l info
   ```

10. Start Django development server:
    ```bash
    python manage.py runserver
    ```

## Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your backend API URL
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| DEBUG | Debug mode | True |
| DJANGO_SECRET_KEY | Django secret key | change-me-in-production |
| ALLOWED_HOSTS | Allowed hosts | localhost,127.0.0.1 |
| DB_NAME | Database name | realestate_leads |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | postgres |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| APIFY_API_KEY | Apify API key | (empty) |
| CORS_ORIGINS | Allowed CORS origins | http://localhost:3000 |

### Frontend (.env.local)

| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:8000/api |

## Project Structure

### Backend
```
backend/
  apps/
    lead_hunter/          - Campaign management
      models.py           - Campaign, CampaignResult models
      views.py            - API viewsets
      urls.py             - URL patterns
    crm/                  - Lead management
      models.py           - Lead, LeadActivity models
      views.py            - API viewsets
      urls.py             - URL patterns
  config/
    settings.py           - Django configuration
    urls.py               - Root URL configuration
  manage.py              - Django management script
  requirements.txt       - Python dependencies
```

### Frontend
```
frontend/
  src/
    app/
      layout.tsx         - Root layout with sidebar
      page.tsx           - Dashboard page
      crm/
        page.tsx         - CRM page with leads table
      lead-hunter/
        page.tsx         - Lead Hunter page
      settings/
        page.tsx         - Settings page
      globals.css        - Global styles
    components/
      DashboardStats.tsx - Stat cards component
      RecentActivity.tsx - Activity feed component
      CampaignForm.tsx   - Campaign creation form
      CampaignList.tsx   - Campaign list table
      LeadList.tsx       - Lead list component
  package.json          - Node dependencies
  tailwind.config.js    - Tailwind configuration
```

## Verification

1. **Backend Admin Panel**: http://localhost:8000/admin
   - Login with superuser credentials
   - Verify Lead Hunter and CRM apps are registered

2. **Frontend Application**: http://localhost:3000
   - Verify dark theme loads correctly
   - Check sidebar navigation works
   - Test page navigation (Dashboard, CRM, Lead Hunter, Settings)

3. **API Endpoints**:
   - GET http://localhost:8000/api/lead-hunter/campaigns/
   - POST http://localhost:8000/api/lead-hunter/campaigns/
   - POST http://localhost:8000/api/lead-hunter/campaigns/{id}/run/
   - GET http://localhost:8000/api/crm/leads/
   - GET http://localhost:8000/api/crm/leads/{id}/

## Development Workflow

### Running Both Services
1. Terminal 1: Start Redis
2. Terminal 2: Start Django backend
3. Terminal 3: Start Celery worker
4. Terminal 4: Start Next.js frontend

### Common Tasks

**Create new migration:**
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

**Build frontend for production:**
```bash
cd frontend
npm run build
npm start
```

**Run backend with Gunicorn (production):**
```bash
cd backend
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify .env database credentials
- Check database exists: `psql -U postgres -l`

### CORS Errors
- Verify CORS_ORIGINS in backend .env
- Check frontend NEXT_PUBLIC_API_URL matches backend URL

### Celery Not Processing Tasks
- Ensure Redis is running
- Check Celery worker logs
- Verify Celery configuration in settings.py

### Frontend Build Errors
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`



cloudflared tunnel --config /home/owais/reli/config.yml run