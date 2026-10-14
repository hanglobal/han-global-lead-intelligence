#!/bin/bash

# Han Global Lead Intelligence - Stop All Services
# This script reliably stops Celery, Django backend, Next.js frontend, and Redis

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

echo -e "${YELLOW}Stopping Han Global Lead Intelligence Services...${NC}"

# Function to stop process by pattern
stop_process() {
    local pattern="$1"
    local name="$2"
    if pgrep -f "$pattern" > /dev/null 2>&1; then
        pkill -9 -f "$pattern" 2>/dev/null || true
        echo -e "${GREEN}✓ Stopped: $name${NC}"
    else
        echo -e "${CYAN}- Not running: $name${NC}"
    fi
}

# Function to kill process by port
kill_port() {
    local port=$1
    local name=$2
    fuser -k -9 "${port}/tcp" 2>/dev/null || true
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        kill -9 $pids 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ Freed port $port ($name)${NC}"
}

# 1. Stop Django backend
if [ -f "$LOGS_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$LOGS_DIR/backend.pid" 2>/dev/null || true)
    if [ -n "$BACKEND_PID" ] && ps -p "$BACKEND_PID" > /dev/null 2>&1; then
        kill -9 "$BACKEND_PID" 2>/dev/null || true
    fi
    rm -f "$LOGS_DIR/backend.pid"
fi
stop_process "daphne.*config.asgi:application" "Django Daphne Backend"
kill_port 5050 "Django Backend"

# 2. Stop Next.js frontend
if [ -f "$LOGS_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$LOGS_DIR/frontend.pid" 2>/dev/null || true)
    if [ -n "$FRONTEND_PID" ] && ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
        kill -9 "$FRONTEND_PID" 2>/dev/null || true
    fi
    rm -f "$LOGS_DIR/frontend.pid"
fi
stop_process "next-server" "Next.js server"
stop_process "next.*dev" "Next.js dev server"
stop_process "node.*next" "Next.js node process"
kill_port 5000 "Next.js Frontend"

# 3. Stop Celery workers & beat
stop_process "celery.*worker" "Celery workers (Dedicated Multi-Queue)"
rm -f "$LOGS_DIR"/celery*.pid

if [ -f "$LOGS_DIR/celery_beat.pid" ]; then
    BEAT_PID=$(cat "$LOGS_DIR/celery_beat.pid" 2>/dev/null || true)
    if [ -n "$BEAT_PID" ] && ps -p "$BEAT_PID" > /dev/null 2>&1; then
        kill -9 "$BEAT_PID" 2>/dev/null || true
    fi
    rm -f "$LOGS_DIR/celery_beat.pid"
fi
stop_process "celery.*beat" "Celery beat"

# 4. Stop Redis
if pgrep -f "redis-server" > /dev/null 2>&1; then
    redis-cli shutdown 2>/dev/null || pkill -9 -f "redis-server" 2>/dev/null || true
    echo -e "${GREEN}✓ Stopped Redis${NC}"
else
    echo -e "${CYAN}- Not running: Redis${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All services stopped successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
exit 0
