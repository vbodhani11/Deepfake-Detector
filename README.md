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

1. **Clone and navigate:**
   ```bash
   cd backend/
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Run with Docker:**
   ```bash
   docker-compose up -d
   ```

5. **Or run locally:**
   ```bash
   # Start PostgreSQL database first
   uvicorn app.main:app --reload
   ```

6. **Run tests:**
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

The backend is designed to integrate with ML models through the service layer. Detection results are stored with:

- Confidence scores
- Processing time
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

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations: `alembic upgrade head`
4. Start the application: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

## Contributing

1. Follow the established architecture patterns
2. Write tests for all new features
3. Update documentation as needed
4. Follow the development workflow order
5. Use proper error handling patterns

## License

[Add your license information here]