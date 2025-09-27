# Model-Backend Integration Guide

This guide explains how to integrate the standalone ML model with the FastAPI backend.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │     Model       │
│   (Optional)    │◄──►│   (FastAPI)     │◄──►│  (Standalone)   │
│                 │    │                 │    │                 │
│ - Upload UI     │    │ - Authentication│    │ - Detection     │
│ - Results       │    │ - File handling │    │ - No Database   │
│ - History       │    │ - Database      │    │ - Pure ML       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔌 Integration Options

### Option 1: Direct Integration (Recommended)

Import the model directly into your backend service:

#### 1. Update Backend Dependencies

Add to `backend/requirements.txt`:
```txt
# ML Model Dependencies (only needed if using direct integration)
tensorflow==2.18.0
opencv-python==4.10.0.84
```

#### 2. Create Model Service

Create `backend/app/services/model_integration.py`:

```python
import sys
from pathlib import Path
from typing import Optional

# Add model to Python path
model_path = Path(__file__).parent.parent.parent.parent / "model"
sys.path.append(str(model_path))

from model.src.detector import create_detector, MediaType, DetectionOutput
from app.core.config import settings

class ModelIntegrationService:
    """Service to integrate the standalone ML model with backend"""
    
    def __init__(self):
        self.detector = None
        self._initialize_detector()
    
    def _initialize_detector(self) -> bool:
        """Initialize the detector on service startup"""
        try:
            model_file_path = settings.MODEL_PATH + "deepfake_detector.h5"
            self.detector = create_detector(model_file_path, "v1.0")
            return self.detector.load_model()
        except Exception as e:
            print(f"Failed to initialize model: {str(e)}")
            return False
    
    def detect_deepfake(self, file_path: str, media_type: str) -> Optional[DetectionOutput]:
        """Perform deepfake detection"""
        if not self.detector or not self.detector.is_loaded:
            raise RuntimeError("Model not loaded")
        
        # Convert string to MediaType enum
        if media_type.lower() == "image":
            media_enum = MediaType.IMAGE
        elif media_type.lower() == "video":
            media_enum = MediaType.VIDEO
        else:
            raise ValueError(f"Unsupported media type: {media_type}")
        
        return self.detector.detect(file_path, media_enum)

# Global instance
model_service = ModelIntegrationService()
```

#### 3. Update Detection Service

Modify `backend/app/services/detection.py`:

```python
# Add this import
from app.services.model_integration import model_service

# Add this method to DetectionService class
def process_detection(self, detection_id: uuid.UUID) -> Detection:
    """Process detection using ML model"""
    detection = self.repository.get(detection_id)
    if not detection:
        raise ValueError(f"Detection with ID {detection_id} not found")
    
    try:
        # Update status to processing
        detection_update = DetectionUpdate(status=DetectionStatus.PROCESSING)
        detection = self.repository.update(detection, detection_update)
        
        # Perform ML detection
        result = model_service.detect_deepfake(
            detection.file_path, 
            detection.media_type.value
        )
        
        # Map model results to database enums
        if result.result.value == "fake":
            db_result = DetectionResult.FAKE
        elif result.result.value == "real":
            db_result = DetectionResult.REAL
        else:
            db_result = DetectionResult.UNCERTAIN
        
        # Determine confidence level
        if result.confidence_score > 0.8:
            confidence_level = ConfidenceLevel.HIGH
        elif result.confidence_score > 0.5:
            confidence_level = ConfidenceLevel.MEDIUM
        else:
            confidence_level = ConfidenceLevel.LOW
        
        # Update detection with results
        final_update = DetectionUpdate(
            status=DetectionStatus.COMPLETED,
            result=db_result,
            confidence_score=result.confidence_score,
            confidence_level=confidence_level,
            processing_time_seconds=result.processing_time_seconds,
            model_version=result.model_version,
            metadata=result.metadata
        )
        
        return self.repository.update(detection, final_update)
        
    except Exception as e:
        # Update status to failed
        error_update = DetectionUpdate(
            status=DetectionStatus.FAILED,
            error_message=str(e)
        )
        return self.repository.update(detection, error_update)
```

#### 4. Update Detection Route

Modify `backend/app/api/routes/detection.py`:

```python
# Add this endpoint
@router.post("/{detection_id}/process", response_model=DetectionResponse)
def process_detection(
    detection_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser
) -> Any:
    """Process a detection using the ML model"""
    try:
        detection_service = DetectionService(repository=DetectionRepository(session))
        detection = detection_service.process_detection(detection_id)
        
        # Verify user permissions
        if detection.user_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Not enough permissions")
            
        return DetectionResponse(**detection.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error in process_detection: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred processing the detection")
```

### Option 2: Microservice Architecture

Deploy the model as a separate service and call it via HTTP:

#### 1. Start Model Server
```bash
cd model/
python api/model_server.py --model-path models/deepfake_detector.h5 --port 5000
```

#### 2. Create HTTP Client Service

Create `backend/app/services/model_client.py`:

```python
import httpx
from typing import Optional, Dict, Any
from app.core.config import settings

class ModelClientService:
    """HTTP client for the model microservice"""
    
    def __init__(self, model_service_url: str = "http://localhost:5000"):
        self.base_url = model_service_url
        self.client = httpx.Client(timeout=300.0)  # 5 minute timeout
    
    async def detect_deepfake(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Send file to model service for detection"""
        try:
            with open(file_path, 'rb') as f:
                files = {"file": f}
                response = self.client.post(f"{self.base_url}/detect", files=files)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            print(f"Model service error: {str(e)}")
            return None
    
    def health_check(self) -> bool:
        """Check if model service is healthy"""
        try:
            response = self.client.get(f"{self.base_url}/health")
            return response.status_code == 200
        except:
            return False

# Global instance
model_client = ModelClientService()
```

## 🚀 Deployment Configurations

### Development Setup
```bash
# Terminal 1: Start Backend
cd backend/
uvicorn app.main:app --reload

# Terminal 2: Start Model Server (if using microservice)
cd model/
python api/model_server.py --model-path models/detector.h5
```

### Docker Compose Setup

Update `backend/docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    # ... existing database config

  backend:
    # ... existing backend config
    depends_on:
      - db
      - model-server  # Add this dependency

  model-server:
    build: 
      context: ../model
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    volumes:
      - ../model/models:/app/models
    environment:
      - MODEL_PATH=/app/models/deepfake_detector.h5
    command: ["python", "api/model_server.py", "--model-path", "/app/models/deepfake_detector.h5", "--host", "0.0.0.0"]

volumes:
  postgres_data:
```

## 🧪 Testing the Integration

### 1. Test Direct Integration
```python
# backend/test_integration.py
from app.services.model_integration import model_service

# Test the integration
result = model_service.detect_deepfake("test_image.jpg", "image")
print(f"Result: {result.result}, Confidence: {result.confidence_score}")
```

### 2. Test Microservice Integration
```bash
# Test model service directly
curl -X POST -F "file=@test_image.jpg" http://localhost:5000/detect

# Test backend integration
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test_image.jpg" \
  -F "media_type=image" \
  http://localhost:8000/api/v1/detection/upload
```

## 🔧 Configuration

Add to `backend/env.example`:
```env
# Model Configuration
MODEL_PATH=../model/models/
MODEL_SERVICE_URL=http://localhost:5000
```

## 📊 Monitoring & Logging

Add model-specific logging:

```python
# backend/app/core/logging.py
import logging

model_logger = logging.getLogger("model_integration")
model_logger.setLevel(logging.INFO)

# Use in services:
model_logger.info(f"Processing detection {detection_id}")
model_logger.error(f"Model error: {str(e)}")
```

## 🚀 Production Considerations

1. **Model Loading**: Initialize model once at startup, not per request
2. **Error Handling**: Graceful fallbacks when model service is unavailable  
3. **Caching**: Cache model results for identical inputs
4. **Scaling**: Deploy multiple model service instances behind load balancer
5. **Monitoring**: Track model performance, response times, and accuracy
6. **Versioning**: Support multiple model versions simultaneously

## ✅ Benefits of This Architecture

- **Separation of Concerns**: ML logic completely separate from business logic
- **Independent Scaling**: Scale model and backend services independently  
- **Technology Flexibility**: Model can be rewritten in different frameworks
- **Testing**: Test ML and backend components separately
- **Deployment**: Deploy model updates without touching backend
- **Security**: Model has no database access, reducing attack surface
