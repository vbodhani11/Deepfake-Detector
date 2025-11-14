#!/bin/bash
# Quick start script for the FastAPI server
cd "$(dirname "$0")"
echo "Starting FastAPI server..."
echo "Make sure you're in the backend directory!"
source venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
