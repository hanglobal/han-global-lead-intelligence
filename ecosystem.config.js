const PYTHON_PATH = '/var/www/han-global-lead-intelligence/backend/.venv/bin/python3';
const BACKEND_DIR = '/var/www/han-global-lead-intelligence/backend';
const LOGS_DIR = '/var/www/han-global-lead-intelligence/logs';

module.exports = {
  apps: [
    {
      name: 'han-backend',
      cwd: BACKEND_DIR,
      script: `${BACKEND_DIR}/.venv/bin/daphne`,
      args: '-b 127.0.0.1 -p 5050 config.asgi:application',
      interpreter: PYTHON_PATH,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      error_file: `${LOGS_DIR}/backend.error.log`,
      out_file: `${LOGS_DIR}/backend.log`,
    },
    {
      name: 'han-frontend',
      cwd: '/var/www/han-global-lead-intelligence/frontend',
      script: 'npm',
      args: 'run dev -- -p 5000 -H 127.0.0.1',
      autorestart: true,
      max_memory_restart: '1G',
      error_file: `${LOGS_DIR}/frontend.error.log`,
      out_file: `${LOGS_DIR}/frontend.log`,
    },
    {
      name: 'celery-nexus',
      cwd: BACKEND_DIR,
      script: `${BACKEND_DIR}/.venv/bin/celery`,
      args: '-A config worker -n nexus_worker@%h -Q nexus_queue -c 1 -l info',
      interpreter: PYTHON_PATH,
      autorestart: true,
      max_memory_restart: '800M',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      error_file: `${LOGS_DIR}/celery_nexus.error.log`,
      out_file: `${LOGS_DIR}/celery.log`,
    },
    {
      name: 'celery-scrape',
      cwd: BACKEND_DIR,
      script: `${BACKEND_DIR}/.venv/bin/celery`,
      args: '-A config worker -n scrape_worker@%h -Q scrape_queue -c 2 -l info',
      interpreter: PYTHON_PATH,
      autorestart: true,
      max_memory_restart: '800M',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      error_file: `${LOGS_DIR}/celery_scrape.error.log`,
      out_file: `${LOGS_DIR}/celery.log`,
    },
    {
      name: 'celery-ai',
      cwd: BACKEND_DIR,
      script: `${BACKEND_DIR}/.venv/bin/celery`,
      args: '-A config worker -n ai_worker@%h -Q ai_queue -c 3 -l info',
      interpreter: PYTHON_PATH,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      error_file: `${LOGS_DIR}/celery_ai.error.log`,
      out_file: `${LOGS_DIR}/celery.log`,
    },
    {
      name: 'celery-crm',
      cwd: BACKEND_DIR,
      script: `${BACKEND_DIR}/.venv/bin/celery`,
      args: '-A config worker -n crm_worker@%h -Q crm_queue,celery -c 1 -l info',
      interpreter: PYTHON_PATH,
      autorestart: true,
      max_memory_restart: '800M',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      error_file: `${LOGS_DIR}/celery_crm.error.log`,
      out_file: `${LOGS_DIR}/celery.log`,
    },
    {
      name: 'celery-beat',
      cwd: BACKEND_DIR,
      script: `${BACKEND_DIR}/.venv/bin/celery`,
      args: '-A config beat -l info',
      interpreter: PYTHON_PATH,
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      error_file: `${LOGS_DIR}/celery_beat.error.log`,
      out_file: `${LOGS_DIR}/celery_beat.log`,
    },
  ],
};
