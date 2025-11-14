# Backend API Server

## Running the Server

**⚠️ IMPORTANT:** The error `ModuleNotFoundError: No module named 'app'` occurs when running from the wrong directory!

### ✅ Solution 1: Use the helper script from project root (EASIEST)
```bash
# From project root
./start_backend.sh
```

### ✅ Solution 2: Run from backend directory (RECOMMENDED)
```bash
cd backend
source venv/bin/activate  # or: source ../.venv/bin/activate if using root venv
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### ✅ Solution 3: Use Python script from project root
```bash
# From project root
source .venv/bin/activate  # or backend/venv/bin/activate
python start_backend_from_root.py
```

### ✅ Solution 4: Manual from root with PYTHONPATH
```bash
# From project root
source .venv/bin/activate
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Why the error occurs

The error `ModuleNotFoundError: No module named 'app'` happens because:
- The code uses `from app.api.main import api_router`
- Python needs to find the `app` module in the current directory or Python path
- When running `python -m uvicorn app.main:app` from the project root, Python looks for `app/` in the root directory
- But `app/` is actually in `backend/app/`, so Python can't find it

**The fix:** Always run uvicorn from the `backend` directory, or use one of the helper scripts above.

## Server Access

Once running, access:
- API Documentation: http://localhost:8000/docs
- Root redirects to: http://localhost:8000/docs
- API Base URL: http://localhost:8000/api/v1

