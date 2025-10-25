# Deepfake Detection Model

This directory contains the deepfake detection model implementation and related tools.

## Structure

```
model/
├── src/                        # Source code
│   ├── detector.py            # Original TensorFlow-based detector (placeholder)
│   └── deepfake_detector.py   # PyTorch-based Xception pipeline (NEW)
├── streamlit_app/             # Streamlit web interface
│   ├── app.py                 # Streamlit UI
│   ├── requirements.txt       # Dependencies
│   └── README.md              # App documentation
├── models/                     # Trained model weights
├── notebooks/                  # Jupyter notebooks
│   ├── finetunning_chunk_00_john.ipynb  # Training notebook
│   └── task3Project.ipynb     # Original Streamlit notebook
├── config/                     # Configuration files
├── data/                       # Data files
└── scripts/                    # Utility scripts
```

## Using the Detector Library

### Basic Usage

```python
from src.deepfake_detector import DeepfakeDetectorPipeline

# Initialize detector
detector = DeepfakeDetectorPipeline()

# Predict on a video
result = detector.predict_video(
    video_path="path/to/video.mp4",
    model_path="models/xception_best.pt",
    fps=3  # Optional: frames per second to extract
)

# Access results
print(f"Prediction: {result['video_prediction']}")  # 'fake' or 'real'
print(f"Confidence: {result['average_confidence']:.2f}")
print(f"Fake ratio: {result['fake_ratio']:.2%}")
```

### As a Library

The `DeepfakeDetectorPipeline` class can be imported and used in any Python project:

```python
from model.src import DeepfakeDetectorPipeline

detector = DeepfakeDetectorPipeline()
result = detector.predict_video("video.mp4", "model.pt")
```

## Running the Streamlit App

See `streamlit_app/README.md` for detailed instructions.

Quick start:
```bash
cd streamlit_app
pip install -r requirements.txt
streamlit run app.py
```

## Training

Use the training notebook `notebooks/finetunning_chunk_00_john.ipynb` to train the Xception model on your dataset.

## Notes

- The model uses MediaPipe for face detection
- Face crops are resized to 299x299 for Xception input
- Preprocessing matches the training pipeline exactly
- Correct class mapping: Class 0 = fake, Class 1 = real
