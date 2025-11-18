# Deepfake Detector

A comprehensive deepfake detection system with both machine learning model and FastAPI backend components.

## Project Structure

```
├── backend/          # FastAPI Backend API
├── model/           # Machine Learning Model
└── README.md        # This file
```

## Backend (FastAPI)

The backend follows a clean architecture pattern inspired by domain-driven design:

### Architecture Overview

- **Entities Layer** (`app/models/entities/`): Input/output models and business objects
- **Repository Layer** (`app/models/repositories/`): Database operations and data persistence
- **Service Layer** (`app/services/`): Business logic and validation
- **Route Layer** (`app/api/routes/`): HTTP endpoints and request/response handling
- **Testing** (`app/tests/`): Unit and integration tests

### Key Features

- JWT-based authentication
- File upload handling for images and videos
- Deepfake detection workflow
- User management
- PostgreSQL database with SQLModel/SQLAlchemy
- Comprehensive testing with pytest
- Docker containerization

### Development Workflow

1. **Entities & Enums** → **Repositories** → **Services** → **Unit Tests** → **Routes** → **Integration Tests**

### Quick Start

**⚠️ Python Version Requirement:** This project requires Python 3.11 or 3.12 (not 3.13+) due to MediaPipe compatibility. If you have Python 3.13, use Python 3.12 instead:
- macOS (Homebrew): Use `/opt/homebrew/bin/python3.12 -m venv venv`
- Or install Python 3.12: `brew install python@3.12`

1. **Clone and navigate:**
   ```bash
   cd backend/
   ```

2. **Create and activate virtual environment:**
   ```bash
   # Create virtual environment with Python 3.11 or 3.12
   # Option 1: If python3.12 is in your PATH:
   python3.12 -m venv venv
   
   # Option 2: If using Homebrew on macOS:
   /opt/homebrew/bin/python3.12 -m venv venv
   
   # Option 3: If you only have python3 (check version first):
   python3 --version  # Should be 3.11 or 3.12
   python3 -m venv venv
   
   # Activate virtual environment
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   # venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   
   **Note:** This will install both FastAPI dependencies and ML dependencies (opencv-python, torch, timm, mediapipe, etc.) required for deepfake detection.

4. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Run with Docker:**
   ```bash
   docker-compose up -d
   ```

6. **Or run locally:**
   ```bash
   # Make sure virtual environment is activated
   # Start PostgreSQL database first
   uvicorn app.main:app --reload
   ```

7. **Run tests:**
   ```bash
   pytest
   ```

### API Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Core Endpoints

- `POST /api/v1/authentication/access-token` - Login
- `POST /api/v1/users/` - Create user
- `GET /api/v1/users/me` - Get current user
- `POST /api/v1/detection/upload` - Upload media for detection
- `GET /api/v1/detection/` - Get detection history

## Model (Machine Learning)

The model directory is structured for ML development:

```
model/
├── data/           # Training and test datasets
├── notebooks/      # Jupyter notebooks for experimentation
├── models/         # Trained model files
└── scripts/        # Training and evaluation scripts
```

### Model Integration

The backend integrates with the ML model through the `DeepfakeDetectorPipeline` service layer. Videos are processed synchronously during upload (similar to the Streamlit app) and results are returned immediately.

**Detection Pipeline:**
- Uses Xception model for deepfake detection
- MediaPipe for face detection
- Processes videos frame-by-frame at configurable FPS
- Returns real-time results with confidence scores

**Detection results include:**
- Confidence scores
- Processing time
- Frame-by-frame predictions
- Video-level prediction (real/fake/uncertain)
- Model version tracking
- Metadata storage

## Development Guidelines

### Backend Development Patterns

1. **Follow the layer architecture**: Entities → Repositories → Services → Routes
2. **Use dependency injection** for repositories in services
3. **Always raise exceptions** in services (never return error messages in models)
4. **Test-driven development**: Write unit tests before implementing features
5. **Use dataclasses** for new classes instead of `__init__` methods

### Error Handling

- **Services**: Raise `ValueError` for validation errors, `Exception` for unexpected errors
- **Routes**: Convert exceptions to `HTTPException` with appropriate status codes
- **Never return error messages** in response models

### Testing Strategy

- **Unit Tests**: Test service layer business logic with mocked repositories
- **Integration Tests**: Test complete API endpoints with real database
- **Run tests**: `pytest` with coverage reporting

## Environment Variables

Key configuration options (see `env.example`):

- `ENVIRONMENT`: Deployment environment
- `SECRET_KEY`: JWT signing key
- `POSTGRES_*`: Database configuration
- `MAX_FILE_SIZE_MB`: Upload size limit
- `MODEL_PATH`: ML model file location

## Deployment

### Docker Deployment

```bash
docker-compose up -d
```

### Manual Deployment

1. Create and activate virtual environment (use Python 3.11 or 3.12):
   ```bash
   python3.12 -m venv venv  # or python3.11
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install dependencies: `pip install -r requirements.txt`
   - This includes ML dependencies (opencv-python, torch, mediapipe, etc.)
3. Set up PostgreSQL database
4. Configure environment variables
5. Run database migrations: `alembic upgrade head`
6. Start the application: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

## Contributing

1. Follow the established architecture patterns
2. Write tests for all new features
3. Update documentation as needed
4. Follow the development workflow order
5. Use proper error handling patterns

## License

[Add your license information here]