#!/bin/bash
# Start the FastAPI backend server from project root
# This script handles the correct directory and virtual environment

cd "$(dirname "$0")/backend"

# Check if backend venv exists, otherwise use root venv
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "../.venv/bin/activate" ]; then
    source ../.venv/bin/activate
else
    echo "Error: No virtual environment found!"
    echo "Please create one in backend/venv or .venv"
    exit 1
fi

# Run from backend directory so Python can find the 'app' module
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

