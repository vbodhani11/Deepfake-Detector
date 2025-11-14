#!/bin/bash
# Script to run the FastAPI server
# Make sure you're in the backend directory or adjust paths accordingly

cd "$(dirname "$0")"
source venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

