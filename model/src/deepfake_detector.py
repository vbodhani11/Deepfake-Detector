"""
Deepfake Detector Pipeline using Xception model
Provides a simple interface for detecting deepfakes in videos
"""

import os
import cv2
import torch
import numpy as np
import mediapipe as mp
from pathlib import Path
from PIL import Image
from torchvision import transforms
import timm
from typing import Union, List, Dict, Any


class DeepfakeDetectorPipeline:
    """
    Simple pipeline that takes video path and model path.
    
    Usage:
        detector = DeepfakeDetectorPipeline()
        result = detector.predict_video("path/to/video.mp4", "path/to/model.pt")
    """
    
    def __init__(self, device: str = None):
        """
        Initialize the pipeline.
        
        Args:
            device (str): Device to run inference on ('cuda', 'cpu', or None for auto)
        """
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        
        # Initialize MediaPipe face detection
        self.mp_face_detection = mp.solutions.face_detection
        self.face_detector = self.mp_face_detection.FaceDetection(
            model_selection=1, 
            min_detection_confidence=0.5
        )
        
        # Define preprocessing transforms (same as your validation transforms)
        self.preprocess = transforms.Compose([
            transforms.Resize(299),
            transforms.CenterCrop(299),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                              std=[0.229, 0.224, 0.225])
        ])
        
        print(f"Pipeline initialized on device: {self.device}")
    
    def _load_model(self, model_path: str):
        """Load the trained Xception model."""
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}")
        
        # Load checkpoint
        checkpoint = torch.load(model_path, map_location=self.device)
        
        # Create model architecture
        model = timm.create_model("xception", pretrained=False, num_classes=2)
        model.load_state_dict(checkpoint['model_state'])
        model = model.to(self.device)
        model.eval()
        
        return model
    
    def _enlarge_box(self, x1: int, y1: int, x2: int, y2: int, 
                    scale: float, W: int, H: int) -> tuple:
        """Enlarge bounding box by scale factor (same as your code)."""
        cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
        w, h = (x2 - x1) * scale, (y2 - y1) * scale
        nx1 = max(0, int(cx - w / 2))
        ny1 = max(0, int(cy - h / 2))
        nx2 = min(W - 1, int(cx + w / 2))
        ny2 = min(H - 1, int(cy + h / 2))
        return nx1, ny1, nx2, ny2
    
    def _detect_largest_face(self, img: np.ndarray) -> tuple:
        """Detect the largest face in the image (same as your code)."""
        # Convert BGR to RGB for MediaPipe
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = self.face_detector.process(img_rgb)
        
        if not results.detections:
            return None
        
        largest_face = None
        largest_area = 0
        
        for detection in results.detections:
            bbox = detection.location_data.relative_bounding_box
            ih, iw, _ = img.shape
            x = int(bbox.xmin * iw)
            y = int(bbox.ymin * ih)
            w = int(bbox.width * iw)
            h = int(bbox.height * ih)
            
            area = w * h
            if area > largest_area:
                largest_area = area
                largest_face = (x, y, x + w, y + h)
        
        return largest_face
    
    def _crop_face(self, img: np.ndarray, face_box: tuple, 
                  enlarge_scale: float = 1.3) -> np.ndarray:
        """Crop and resize face to 299x299 (same as your code)."""
        x1, y1, x2, y2 = face_box
        H, W = img.shape[:2]
        
        # Enlarge bounding box
        x1, y1, x2, y2 = self._enlarge_box(x1, y1, x2, y2, enlarge_scale, W, H)
        
        # Crop face
        face_crop = img[y1:y2, x1:x2]
        
        # Resize to 299x299
        face_crop = cv2.resize(face_crop, (299, 299), interpolation=cv2.INTER_AREA)
        
        return face_crop
    
    def _preprocess_frame(self, frame: np.ndarray) -> torch.Tensor:
        """Preprocess a single frame."""
        # Detect face
        face_box = self._detect_largest_face(frame)
        if face_box is None:
            return None
        
        # Crop face
        face_crop = self._crop_face(frame, face_box)
        
        # Convert to PIL Image for transforms
        face_pil = Image.fromarray(cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB))
        
        # Apply preprocessing transforms
        tensor = self.preprocess(face_pil)
        
        return tensor.unsqueeze(0)  # Add batch dimension
    
    def predict_video(self, video_path: str, model_path: str, fps: int = 3) -> Dict[str, Any]:
        """
        Predict if a video contains deepfakes.
        
        Args:
            video_path (str): Path to the video file
            model_path (str): Path to the trained model
            fps (int): Frames per second to extract (default: 3)
            
        Returns:
            Dict containing prediction results with the following keys:
            - video_path: Path to the video file
            - video_prediction: "fake" or "real"
            - total_frames_processed: Number of frames analyzed
            - fake_frames: Number of frames predicted as fake
            - real_frames: Number of frames predicted as real
            - fake_ratio: Ratio of fake frames to total frames
            - average_confidence: Average confidence score
            - average_fake_probability: Average probability of being fake
            - frame_predictions: List of per-frame predictions
        """
        # Load model
        model = self._load_model(model_path)
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"error": f"Could not open video {video_path}"}
        
        frame_count = 0
        predictions = []
        
        # Get video properties
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        frame_interval = int(video_fps / fps)
        
        print(f"Processing video: {video_path}")
        print(f"Extracting {fps} FPS from {video_fps:.1f} FPS video")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Extract frames at specified interval
            if frame_count % frame_interval == 0:
                try:
                    # Preprocess frame
                    input_tensor = self._preprocess_frame(frame)
                    if input_tensor is not None:
                        input_tensor = input_tensor.to(self.device)
                        
                        # Model inference
                        with torch.no_grad():
                            logits = model(input_tensor)
                            probabilities = torch.softmax(logits, dim=1)
                            
                        # FIXED: Correct class mapping based on your training data
                        # Class 0: fake_videos (should be labeled as "fake")
                        # Class 1: real_videos (should be labeled as "real")
                        fake_prob = probabilities[0][0].item()  # Class 0 = fake_videos
                        real_prob = probabilities[0][1].item()  # Class 1 = real_videos
                        prediction = "fake" if fake_prob > 0.5 else "real"
                        confidence = max(fake_prob, real_prob)
                        
                        predictions.append({
                            "frame_number": frame_count,
                            "prediction": prediction,
                            "confidence": confidence,
                            "fake_probability": fake_prob,
                            "real_probability": real_prob
                        })
                        
                except Exception as e:
                    print(f"Error processing frame {frame_count}: {e}")
            
            frame_count += 1
        
        cap.release()
        
        if not predictions:
            return {"error": "No valid predictions made"}
        
        # Calculate video-level statistics
        fake_predictions = [p for p in predictions if p["prediction"] == "fake"]
        avg_confidence = np.mean([p["confidence"] for p in predictions])
        avg_fake_prob = np.mean([p["fake_probability"] for p in predictions])
        
        return {
            "video_path": video_path,
            "total_frames_processed": len(predictions),
            "fake_frames": len(fake_predictions),
            "real_frames": len(predictions) - len(fake_predictions),
            "fake_ratio": len(fake_predictions) / len(predictions),
            "average_confidence": avg_confidence,
            "average_fake_probability": avg_fake_prob,
            "video_prediction": "fake" if len(fake_predictions) > len(predictions) / 2 else "real",
            "frame_predictions": predictions
        }
