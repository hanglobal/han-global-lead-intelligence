#!/bin/bash

# Han Global Lead Intelligence - Start All Services
# This script reliably starts Redis, Celery, Django backend, and Next.js frontend

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOGS_DIR="$PROJECT_ROOT/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Han Global Lead Intelligence Services...${NC}"

# Function to check if a process is running
is_running() {
    pgrep -f "$1" > /dev/null 2>&1
}

# Function to check if a port is in use
is_port_in_use() {
    lsof -i :$1 > /dev/null 2>&1
}

# 1. Start Redis
start_redis() {
    if is_running "redis-server"; then
        echo -e "${YELLOW}Redis is already running${NC}"
    else
        echo -e "${GREEN}Starting Redis...${NC}"
        redis-server --daemonize yes
        sleep 1
        if is_running "redis-server"; then
            echo -e "${GREEN}Redis started successfully${NC}"
        else
            echo -e "${RED}Failed to start Redis${NC}"
            exit 1
        fi
    fi
}

# 2. Start Dedicated Multi-Queue Celery Workers (Nexus: 1, Scrape: 2, AI: 3, CRM: 1)
start_celery() {
    if is_running "celery.*worker"; then
        echo -e "${YELLOW}Celery workers are already running${NC}"
    else
        echo -e "${GREEN}Starting Dedicated Multi-Queue Celery Workers (Total 7 slots)...${NC}"
        cd "$BACKEND_DIR"
        source .venv/bin/activate
        > "$LOGS_DIR/celery.log"

        # 1. Nexus Worker (1 slot: B2B Search & LinkedIn Scraping)
        celery -A config worker -n nexus_worker@%h -Q nexus_queue -c 1 -l info --detach --logfile="$LOGS_DIR/celery.log" --pidfile="$LOGS_DIR/celery_nexus.pid" 2>/dev/null || true

        # 2. Firecrawl Scrape Worker (2 slots: 2 Browser Slots, 35s Staggered Pacing)
        celery -A config worker -n scrape_worker@%h -Q scrape_queue -c 2 -l info --detach --logfile="$LOGS_DIR/celery.log" --pidfile="$LOGS_DIR/celery_scrape.pid" 2>/dev/null || true

        # 3. AI Worker (3 slots: Matches Ollama 3-Concurrent Capacity 100%)
        celery -A config worker -n ai_worker@%h -Q ai_queue -c 3 -l info --detach --logfile="$LOGS_DIR/celery.log" --pidfile="$LOGS_DIR/celery_ai.pid" 2>/dev/null || true

        # 4. CRM & Default Worker (1 slot: Fast CRM Ingestion, Scoring, Beat Tasks)
        celery -A config worker -n crm_worker@%h -Q crm_queue,celery -c 1 -l info --detach --logfile="$LOGS_DIR/celery.log" --pidfile="$LOGS_DIR/celery_crm.pid" 2>/dev/null || true

        sleep 2
        if is_running "celery.*worker"; then
            echo -e "${GREEN}All 4 Dedicated Celery Workers (Nexus, Scrape, AI, CRM) started successfully!${NC}"
        else
            echo -e "${YELLOW}Celery workers starting in background${NC}"
        fi
        deactivate
    fi
}

# 2b. Start Celery Beat (Periodic task scheduler)
start_celery_beat() {
    if is_running "celery.*beat"; then
        echo -e "${YELLOW}Celery beat is already running${NC}"
    else
        echo -e "${GREEN}Starting Celery beat...${NC}"
        cd "$BACKEND_DIR"
        source .venv/bin/activate
        > "$LOGS_DIR/celery_beat.log"
        celery -A config beat -l info --detach --logfile="$LOGS_DIR/celery_beat.log" --pidfile="$LOGS_DIR/celery_beat.pid" 2>/dev/null || true
        sleep 2
        if is_running "celery.*beat"; then
            echo -e "${GREEN}Celery beat started successfully${NC}"
        else
            echo -e "${YELLOW}Celery beat starting in background${NC}"
        fi
        deactivate
    fi
}

# 3. Start Django backend
start_backend() {
    if is_port_in_use 5050; then
        echo -e "${YELLOW}Django backend is already running on port 5050${NC}"
    else
        echo -e "${GREEN}Starting Django backend (daphne)...${NC}"
        # Ensure port 5050 is clear of stale sockets
        lsof -ti:5050 | xargs -r kill -9 2>/dev/null || true
        sleep 1

        cd "$BACKEND_DIR"
        source .venv/bin/activate
        > "$LOGS_DIR/backend.log"
        nohup daphne \
            -b 127.0.0.1 \
            -p 5050 \
            config.asgi:application \
            > "$LOGS_DIR/backend.log" 2>&1 &
        local spawned_pid=$!
        echo $spawned_pid > "$LOGS_DIR/backend.pid"
        
        # Wait up to 6s for port 5050 to bind
        local count=0
        while [ $count -lt 6 ]; do
            if is_port_in_use 5050; then
                echo -e "${GREEN}Django backend (daphne) started successfully (PID: $spawned_pid)${NC}"
                deactivate
                return 0
            fi
            sleep 1
            count=$((count+1))
        done

        if is_port_in_use 5050 || ps -p "$spawned_pid" > /dev/null 2>&1; then
            echo -e "${GREEN}Django backend (daphne) started successfully (PID: $spawned_pid)${NC}"
        else
            echo -e "${RED}Failed to start Django backend${NC}"
            deactivate
            exit 1
        fi
        deactivate
    fi
}

# 4. Start Next.js frontend
start_frontend() {
    if is_port_in_use 5000; then
        # If port 5000 is in use, let's verify if it's healthy or stale
        if curl -s -m 2 http://localhost:5000 > /dev/null 2>&1; then
            echo -e "${YELLOW}Next.js frontend is already running on port 5000${NC}"
            return 0
        else
            echo -e "${YELLOW}Clearing stale process on port 5000...${NC}"
            lsof -ti:5000 | xargs -r kill -9 2>/dev/null || true
            sleep 1
        fi
    fi

    # Ensure port 5000 is clean before starting
    lsof -ti:5000 | xargs -r kill -9 2>/dev/null || true
    pkill -f "next-dev" 2>/dev/null || true
    sleep 1

    echo -e "${GREEN}Starting Next.js frontend...${NC}"
    cd "$FRONTEND_DIR"
    > "$LOGS_DIR/frontend.log"
    nohup npm run dev -- -p 5000 -H 127.0.0.1 > "$LOGS_DIR/frontend.log" 2>&1 &
    local spawned_pid=$!
    echo $spawned_pid > "$LOGS_DIR/frontend.pid"

    # Wait up to 8s for dev server to initialize
    local count=0
    while [ $count -lt 8 ]; do
        if is_port_in_use 5000 || grep -q "Ready" "$LOGS_DIR/frontend.log" 2>/dev/null; then
            echo -e "${GREEN}Next.js frontend started successfully (PID: $spawned_pid)${NC}"
            return 0
        fi
        sleep 1
        count=$((count+1))
    done

    if is_port_in_use 5000 || ps -p "$spawned_pid" > /dev/null 2>&1; then
        echo -e "${GREEN}Next.js frontend started successfully (PID: $spawned_pid)${NC}"
    else
        echo -e "${RED}Failed to start Next.js frontend${NC}"
        tail -n 10 "$LOGS_DIR/frontend.log"
        exit 1
    fi
}

# Pre-flight Checks
if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo -e "${RED}Backend virtual environment not found. Please run setup first.${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${RED}Frontend node_modules not found. Please run npm install first.${NC}"
    exit 1
fi

if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    echo -e "${YELLOW}Warning: Frontend .env.local not found. Creating default...${NC}"
    echo 'NEXT_PUBLIC_API_URL=http://localhost:5050/api' > "$FRONTEND_DIR/.env.local"
fi

# Execute start sequence
start_redis
start_celery
start_celery_beat
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
echo -e "${YELLOW}  Backend: tail -f logs/backend.log${NC}"
echo -e "${YELLOW}  Frontend: tail -f logs/frontend.log${NC}"
echo -e "${YELLOW}  Celery: tail -f logs/celery.log${NC}"
echo -e "${YELLOW}  Celery Beat: tail -f logs/celery_beat.log${NC}"
exit 0
