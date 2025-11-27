# Deepfake Detector

A comprehensive deepfake detection system with FastAPI backend, React frontend, and ML model.

## Project Structure

```
├── backend/     # FastAPI Backend API
├── model/       # Machine Learning Model
├── UI/          # React Frontend
└── README.md    # This file
```

## Backend Setup

1. `cd backend`
2. `python3.12 -m venv venv` (or `python3.11`)
3. `source venv/bin/activate`
4. `pip install -r requirements.txt`
5. `cp env.example .env`
6. Create database: `createdb deepfake_detector` (or use `psql` command)
7. `alembic upgrade head`
8. `docker-compose up -d` OR `uvicorn app.main:app --reload`

**Migrations:**
- Generate: `alembic revision --autogenerate -m "description"`
- Apply: `alembic upgrade head`
- Rollback: `alembic downgrade -1`

**API Docs:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Frontend Setup

1. `cd UI`
2. `npm install`
3. `npm start`

Visit `http://localhost:5173` (Vite default port)

**Scripts:**
- `npm start` - Development server
- `npm run build` - Production build
- `npm run test:unit` - Run tests

**Tech Stack:** React 18 • TypeScript • Vite • Tailwind CSS

## ML Model

- Uses Xception model for deepfake detection
- OpenCV/MediaPipe for face detection
- Processes videos frame-by-frame
- Returns confidence scores and predictions

## Key Features

- JWT authentication
- Video/image upload and analysis
- Real-time processing with progress tracking
- Confidence scoring with detailed reports
- PostgreSQL database with SQLModel/SQLAlchemy
