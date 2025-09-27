# Deepfake Detection Model

**🔥 Completely Independent ML Component - No Database Dependencies!**

This directory contains a standalone machine learning system for deepfake detection that can run independently of any backend or database.

## Structure

```
model/
├── src/            # Core detection logic
│   └── detector.py # Main DeepfakeDetector class
├── config/         # Configuration files
│   └── model_config.py
├── api/            # Standalone Flask API server
│   └── model_server.py
├── scripts/        # Training and testing scripts
│   ├── train_model.py
│   └── test_detector.py
├── data/           # Training and test datasets
├── notebooks/      # Jupyter notebooks for experimentation  
├── models/         # Trained model files (.h5, .pkl, etc.)
├── requirements.txt # ML-specific dependencies
└── README.md       # This file
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd model/
pip install -r requirements.txt
```

### 2. Train a Model
```bash
# Organize your data like this:
# data/train/real/ (real images/videos)
# data/train/fake/ (fake images/videos)

python scripts/train_model.py --data-dir data/ --epochs 50
```

### 3. Test Your Model
```bash
# Test single file
python scripts/test_detector.py --model-path models/your_model.h5 --file test_image.jpg --type image

# Test directory
python scripts/test_detector.py --model-path models/your_model.h5 --directory test_images/ --type image
```

### 4. Run Standalone API Server
```bash
# Start the model server (independent of main backend)
python api/model_server.py --model-path models/your_model.h5 --port 5000

# Test the API
curl -X POST -F "file=@test_image.jpg" http://localhost:5000/detect
```

## 🏗️ Architecture Features

### ✅ Zero Dependencies on Backend
- **No database connections**
- **No authentication required**  
- **No external API calls**
- **Completely self-contained**

### ✅ Multiple Deployment Options
1. **Standalone Python Library** - Import and use directly
2. **Flask Microservice** - Independent API server
3. **Backend Integration** - Called from main FastAPI backend
4. **Batch Processing** - Command-line scripts

### ✅ Flexible Input/Output
- **Input**: Images (jpg, png, bmp) or Videos (mp4, avi, mov)
- **Output**: Structured results with confidence scores
- **Metadata**: Processing time, model version, frame analysis

## 📁 Core Components

### `src/detector.py` - Main Detection Class
```python
from src.detector import create_detector, MediaType

# Create detector
detector = create_detector("models/my_model.h5")

# Detect deepfake
result = detector.detect("image.jpg", MediaType.IMAGE)
print(f"Result: {result.result}, Confidence: {result.confidence_score}")
```

### `config/model_config.py` - Configuration Management
- Model paths and versions
- Input specifications (image size, video frames)
- File format support
- Processing parameters

### `api/model_server.py` - Standalone API Server
- **Flask-based microservice**
- **RESTful endpoints** for detection
- **File upload handling**
- **Health check endpoint**

### `scripts/` - Training & Testing Tools
- `train_model.py` - Complete training pipeline
- `test_detector.py` - Batch testing and evaluation

## 🔌 Integration Options

### Option 1: Direct Integration (Recommended)
```python
# In your backend service
from model.src.detector import create_detector, MediaType

detector = create_detector("model/models/deepfake_detector.h5")
result = detector.detect(uploaded_file_path, MediaType.IMAGE)
```

### Option 2: Microservice Architecture
```python
# Backend calls model API
import requests

response = requests.post(
    "http://model-server:5000/detect",
    files={"file": open("image.jpg", "rb")}
)
result = response.json()
```

### Option 3: Batch Processing
```bash
# Process entire directories
python model/scripts/test_detector.py \
    --model-path models/detector.h5 \
    --directory /path/to/images \
    --type image
```

## 📊 Model Output Format

```python
@dataclass
class DetectionOutput:
    result: DetectionResult          # "real", "fake", "uncertain"
    confidence_score: float          # 0.0 to 1.0
    processing_time_seconds: float   # Processing duration
    metadata: Dict[str, Any]         # Additional info
    model_version: str               # Model version used
```

## 🧪 Development Workflow

1. **Data Preparation**: Organize datasets in `data/`
2. **Exploration**: Use `notebooks/` for analysis
3. **Training**: Run `scripts/train_model.py`
4. **Testing**: Validate with `scripts/test_detector.py`
5. **Deployment**: Choose integration option above

## 🚀 Production Deployment

### Standalone Model Server
```bash
# Production deployment with Gunicorn
cd model/
gunicorn -w 4 -b 0.0.0.0:5000 api.model_server:app
```

### Docker Deployment
```dockerfile
# Add to model/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "api/model_server.py", "--model-path", "models/detector.h5"]
```

## ✨ Benefits of This Architecture

- 🔒 **Security**: No database access = reduced attack surface
- 🚀 **Performance**: Optimized for ML workloads only
- 🔧 **Flexibility**: Deploy anywhere (cloud, edge, local)
- 🧪 **Testing**: Easy to unit test without database setup
- 📦 **Packaging**: Can be distributed as standalone library
- 🔄 **Versioning**: Independent model versioning and deployment
