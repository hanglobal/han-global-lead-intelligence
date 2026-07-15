#!/bin/bash

# Han Global Lead Intelligence - Stop All Services
# This script stops Redis, Celery, Django backend, and Next.js frontend

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping Han Global Lead Intelligence Services...${NC}"

# Function to stop process by pattern
stop_process() {
    if pgrep -f "$1" > /dev/null 2>&1; then
        pkill -f "$1"
        echo -e "${GREEN}Stopped: $1${NC}"
        return 0
    else
        echo -e "${YELLOW}Not running: $1${NC}"
        return 1
    fi
}

# Function to kill process by port
kill_port() {
    local port=$1
    local name=$2
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        kill $pid 2>/dev/null
        echo -e "${GREEN}Stopped $name (port $port, PID: $pid)${NC}"
    else
        echo -e "${YELLOW}Not running on port $port: $name${NC}"
    fi
}

# Stop Django backend
if [ -f "$BACKEND_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$BACKEND_DIR/backend.pid")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID
        echo -e "${GREEN}Stopped Django backend (PID: $BACKEND_PID)${NC}"
    else
        echo -e "${YELLOW}Django backend PID file stale (PID: $BACKEND_PID)${NC}"
    fi
    rm -f "$BACKEND_DIR/backend.pid"
elif [ -f "$FRONTEND_DIR/backend.pid" ]; then
    # Handle misplaced PID file (bug fix for legacy runs)
    BACKEND_PID=$(cat "$FRONTEND_DIR/backend.pid")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID
        echo -e "${GREEN}Stopped Django backend (PID: $BACKEND_PID)${NC}"
    else
        echo -e "${YELLOW}Django backend PID file stale (PID: $BACKEND_PID)${NC}"
    fi
    rm -f "$FRONTEND_DIR/backend.pid"
else
    stop_process "python.*manage.py.*runserver" || kill_port 5050 "Django backend"
fi

# Stop Next.js frontend
if [ -f "$FRONTEND_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_DIR/frontend.pid")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID
        echo -e "${GREEN}Stopped Next.js frontend (PID: $FRONTEND_PID)${NC}"
    else
        echo -e "${YELLOW}Next.js frontend PID file stale (PID: $FRONTEND_PID)${NC}"
    fi
    rm -f "$FRONTEND_DIR/frontend.pid"
else
    stop_process "next.*dev" || stop_process "node.*next" || kill_port 5000 "Next.js frontend"
fi

# Stop Celery worker
stop_process "celery.*config.*worker"

# Stop Redis
if pgrep -f "redis-server" > /dev/null 2>&1; then
    redis-cli shutdown
    echo -e "${GREEN}Stopped Redis${NC}"
else
    echo -e "${YELLOW}Redis not running${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All services stopped successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
