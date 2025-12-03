#!/bin/bash

# Simple startup script for Deepfake Detector
# Starts both backend and frontend

set -e

echo "🚀 Starting Deepfake Detector..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -d "backend" ] || [ ! -d "UI" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${BLUE}📦 Starting Backend...${NC}"
cd backend

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating one...${NC}"
    python3.12 -m venv venv || python3.11 -m venv venv || python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Installing backend dependencies...${NC}"
    pip install -r requirements.txt
fi

# Start backend server
echo -e "${GREEN}✅ Backend starting on http://localhost:8000${NC}"
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Start Frontend
echo -e "${BLUE}📦 Starting Frontend...${NC}"
cd UI

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend server
echo -e "${GREEN}✅ Frontend starting on http://localhost:5173${NC}"
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}✨ Both servers are running!${NC}"
echo ""
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait

