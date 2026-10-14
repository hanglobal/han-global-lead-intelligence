import environ
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# django-environ setup
# Defaults are defined here so the app runs even without a .env file.
# ---------------------------------------------------------------------------
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1']),
    CORS_ALLOW_ALL=(bool, False),
)

# Read the .env file that lives next to manage.py
environ.Env.read_env(BASE_DIR / '.env')

# ---------------------------------------------------------------------------
# Core Django settings
# ---------------------------------------------------------------------------
DEBUG = env('DEBUG')
SECRET_KEY = env('DJANGO_SECRET_KEY')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    # Project apps
    'apps.lead_hunter',
    'apps.crm',
    'apps.enrichment',
    'apps.users',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'config.basic_auth_middleware.BasicAuthMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ---------------------------------------------------------------------------
# Database — individual vars kept for .env backwards compatibility
# ---------------------------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME', default='realestate_leads'),
        'USER': env('DB_USER', default='postgres'),
        'PASSWORD': env('DB_PASSWORD', default='postgres'),
        'HOST': env('DB_HOST', default='localhost'),
        'PORT': env('DB_PORT', default='5432'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'America/New_York'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# Security Headers (Production)
# ---------------------------------------------------------------------------
if not DEBUG:
    # Cloudflare / reverse proxy handles SSL termination; Django-level redirect disabled to avoid redirect loops
    SECURE_SSL_REDIRECT = False
    SECURE_HSTS_SECONDS = 31536000           # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '1000/minute'
    }
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ORIGINS',
    default=[
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
    ],
)
CORS_ALLOW_ALL_ORIGINS = env('CORS_ALLOW_ALL')

# ---------------------------------------------------------------------------
# Celery / Redis
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Dedicated Multi-Queue Routing for Maximum Throughput & Zero Blocking
CELERY_TASK_DEFAULT_QUEUE = 'celery'
CELERY_TASK_ROUTES = {
    # 1. Nexus tasks (Search & LinkedIn Scraping/Polling) -> nexus_queue (1 Worker)
    'apps.lead_hunter.tasks.poll_nexus_campaign_run': {'queue': 'nexus_queue'},
    'apps.enrichment.tasks.poll_lead_linkedin_enrichment_task': {'queue': 'nexus_queue'},

    # 2. Firecrawl Website Scraping -> scrape_queue (2 Workers, 35s pacing)
    'apps.enrichment.tasks.campaign_scrape_stage_task': {'queue': 'scrape_queue'},

    # 3. AI / Ollama GLM-5.3 (Qualification, Insights, Cold Emails) -> ai_queue (3 Workers)
    'apps.enrichment.tasks.process_single_lead_task': {'queue': 'ai_queue'},

    # 4. CRM Ingestion, Scoring & Beat Sweeper -> crm_queue (1 Worker)
    'apps.crm.tasks.score_pending_leads': {'queue': 'crm_queue'},
    'apps.crm.tasks.sweep_stuck_leads': {'queue': 'crm_queue'},
}

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# ---------------------------------------------------------------------------
# Third-party services
# Firecrawl API
FIRECRAWL_API_KEY = env('FIRECRAWL_API_KEY', default='')

# Nexus Data Solutions API
NEXUS_BASE_URL = env('NEXUS_BASE_URL', default='https://app.nexusdatasolutions.online/api/v1')
NEXUS_CLIENT_ID = env('NEXUS_CLIENT_ID', default='')
NEXUS_CLIENT_SECRET = env('NEXUS_CLIENT_SECRET', default='')

# Basic Auth settings
BASIC_AUTH_USERNAME = env('BASIC_AUTH_USERNAME', default='admin')
BASIC_AUTH_PASSWORD = env('BASIC_AUTH_PASSWORD', default='')

# Public URL of the backend — used for callbacks and SSE
BACKEND_URL = env('BACKEND_URL', default='http://localhost:5050')

# ---------------------------------------------------------------------------
# Celery Beat Schedule — Periodic Tasks
# ---------------------------------------------------------------------------
from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {
    # Dead-letter recovery: re-queues leads stuck in partial pipeline states
    'sweep-stuck-leads-every-30min': {
        'task': 'apps.crm.tasks.sweep_stuck_leads',
        'schedule': crontab(minute='*/30'),   # Every 30 minutes
    },
    # Periodic scoring: scores and qualifies pending leads
    'score-pending-leads-every-hour': {
        'task': 'apps.crm.tasks.score_pending_leads',
        'schedule': crontab(minute='15', hour='*'),  # Hourly at :15
    },
}
