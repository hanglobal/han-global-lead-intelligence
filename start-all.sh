#!/bin/bash

# Han Global Lead Intelligence - Start All Services
# This script starts Redis, Celery, Django backend, and Next.js frontend

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Han Global Lead Intelligence Services...${NC}"

# Function to check if a process is running
is_running() {
    pgrep -f "$1" > /dev/null 2>&1
}

# Function to start Redis
start_redis() {
    if is_running "redis-server"; then
        echo -e "${YELLOW}Redis is already running${NC}"
    else
        echo -e "${GREEN}Starting Redis...${NC}"
        redis-server --daemonize yes
        sleep 2
        if is_running "redis-server"; then
            echo -e "${GREEN}Redis started successfully${NC}"
        else
            echo -e "${RED}Failed to start Redis${NC}"
            exit 1
        fi
    fi
}

# Function to start Celery
start_celery() {
    if is_running "celery.*config.*worker"; then
        echo -e "${YELLOW}Celery worker is already running${NC}"
    else
        echo -e "${GREEN}Starting Celery worker...${NC}"
        cd "$BACKEND_DIR"
        source .venv/bin/activate
        > celery.log
        if celery -A config worker -l info --concurrency=1 --detach --logfile=celery.log 2>/dev/null; then
            sleep 2
            if is_running "celery.*config.*worker"; then
                echo -e "${GREEN}Celery worker started successfully${NC}"
            else
                echo -e "${YELLOW}Celery worker failed to start (may not have tasks defined yet)${NC}"
            fi
        else
            echo -e "${YELLOW}Celery worker failed to start (skipping - no tasks defined yet)${NC}"
        fi
        deactivate
    fi
}

# Function to start Django backend
start_backend() {
    if is_running "python.*manage.py.*runserver"; then
        echo -e "${YELLOW}Django backend is already running${NC}"
    else
        echo -e "${GREEN}Starting Django backend...${NC}"
        cd "$BACKEND_DIR"
        source .venv/bin/activate
        python manage.py runserver 0.0.0.0:5050 > backend.log 2>&1 &
        sleep 3
        BACKEND_PID=$(pgrep -f "python.*manage.py.*runserver" | head -1)
        if [ -n "$BACKEND_PID" ]; then
            echo $BACKEND_PID > backend.pid
            echo -e "${GREEN}Django backend started successfully (PID: $BACKEND_PID)${NC}"
        else
            echo -e "${RED}Failed to start Django backend${NC}"
            exit 1
        fi
        deactivate
    fi
}

# Function to start Next.js frontend
start_frontend() {
    if is_running "node.*next"; then
        echo -e "${YELLOW}Next.js frontend is already running${NC}"
    else
        echo -e "${GREEN}Starting Next.js frontend...${NC}"
        cd "$FRONTEND_DIR"
        npm run dev -- -p 5000 -H 0.0.0.0 > frontend.log 2>&1 &
        sleep 5
        FRONTEND_PID=$(pgrep -f "node.*next" | head -1)
        if [ -n "$FRONTEND_PID" ]; then
            echo $FRONTEND_PID > frontend.pid
            echo -e "${GREEN}Next.js frontend started successfully (PID: $FRONTEND_PID)${NC}"
        else
            echo -e "${RED}Failed to start Next.js frontend${NC}"
            exit 1
        fi
    fi
}

# Check if .venv exists in backend
if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo -e "${RED}Backend virtual environment not found. Please run setup first.${NC}"
    exit 1
fi

# Check if node_modules exists in frontend
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${RED}Frontend node_modules not found. Please run npm install first.${NC}"
    exit 1
fi

# Check if frontend .env.local exists
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    echo -e "${YELLOW}Warning: Frontend .env.local not found. Creating default...${NC}"
    echo 'NEXT_PUBLIC_API_URL=http://localhost:5050/api' > "$FRONTEND_DIR/.env.local"
fi

# Start services
start_redis
start_celery
start_backend
start_frontend

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All services started successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backend Admin: http://localhost:5050/admin${NC}"
echo -e "${GREEN}Frontend: http://localhost:5000${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}To stop all services, run: ./stop-all.sh${NC}"
echo -e "${YELLOW}To view logs:${NC}"
echo -e "${YELLOW}  Backend: tail -f backend/backend.log${NC}"
echo -e "${YELLOW}  Frontend: tail -f frontend/frontend.log${NC}"
echo -e "${YELLOW}  Celery: tail -f backend/celery.log${NC}"
