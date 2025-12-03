"""
Detection Service V2 - Notebook-Accurate Deepfake Detection

This service replicates the exact workflow from the training notebooks:
1. Extract frames using ffmpeg (fps=3)
2. Crop faces using MediaPipe/OpenCV (1.3x enlargement, 299x299)
3. Batch predict on all crops
4. Aggregate using DFDC winner's confident strategy
"""

import os
import sys
import time
import logging
from pathlib import Path
from typing import Optional, Dict, Any

import torch
import numpy as np
from torchvision import transforms
import timm

# Add model directory to Python path
model_src_path = Path(__file__).parent.parent.parent.parent / "model" / "src"
if str(model_src_path) not in sys.path:
    sys.path.insert(0, str(model_src_path))

try:
    from video_processing import (
        extract_frames_from_video,
        crop_faces_from_frames,
        create_temp_processing_dir,
        cleanup_temp_dir
    )
    from aggregation_strategies import get_aggregation_strategy
    VIDEO_PROCESSING_AVAILABLE = True
except ImportError as e:
    VIDEO_PROCESSING_AVAILABLE = False
    print(f"Warning: Video processing dependencies not available: {e}")

from app.core.config import settings
from app.models.entities.enums import DetectionStatus, DetectionResult

logger = logging.getLogger(__name__)

# ImageNet normalization constants (same as training)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


class DetectionServiceV2:
    """
    Detection Service V2 - Replicates notebook workflow exactly.
    
    Workflow:
        1. Extract frames from video using ffmpeg (fps=3)
        2. Crop faces from frames (MediaPipe/OpenCV, 1.3x enlargement, 299x299)
        3. Batch predict on all face crops
        4. Aggregate using confident strategy or simple majority vote
        5. Cleanup temporary files
    """
    
    def __init__(self, model_path: Optional[str] = None, device: Optional[str] = None):
        """
        Initialize Detection Service V2.
        
        Args:
            model_path: Path to model checkpoint (default: from settings)
            device: Device to run inference on ('cuda', 'cpu', or None for auto)
        """
        if not VIDEO_PROCESSING_AVAILABLE:
            raise ImportError(
                "Video processing dependencies are not available. "
                "Please ensure all dependencies are installed."
            )
        
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"DetectionServiceV2 initialized on device: {self.device}")
        
        # Determine model path
        if model_path is None:
            model_path = settings.MODEL_PATH
        
        # Resolve model path
        model_path = Path(model_path)
        if not model_path.is_absolute():
            project_root = Path(__file__).parent.parent.parent.parent
            model_path = project_root / model_path
        
        self.model_path = model_path
        
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found at {self.model_path}")
        
        # Model will be loaded lazily on first use
        self.model = None
        
        # Define preprocessing transforms (same as validation in notebook)
        self.preprocess = transforms.Compose([
            transforms.Resize(299),
            transforms.CenterCrop(299),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])
    
    def _load_model(self):
        """Load the trained Xception model (lazy loading)"""
        if self.model is not None:
            return self.model
        
        logger.info(f"Loading model from {self.model_path}")
        
        # Load checkpoint
        checkpoint = torch.load(self.model_path, map_location=self.device)
        
        # Create model architecture
        model = timm.create_model("xception", pretrained=False, num_classes=2)
        model.load_state_dict(checkpoint['model_state'])
        model = model.to(self.device)
        model.eval()
        
        self.model = model
        logger.info("Model loaded successfully")
        return self.model
    
    def _predict_crops_batch(
        self,
        crop_files: list[Path]
    ) -> np.ndarray:
        """
        Run batch prediction on face crops.
        
        Args:
            crop_files: List of paths to face crop image files
        
        Returns:
            Array of fake probabilities (one per crop)
        """
        from PIL import Image
        
        model = self._load_model()
        
        # Load and preprocess all crops
        crops_tensor_list = []
        valid_crops = []
        
        for crop_file in crop_files:
            try:
                # Load image
                img = Image.open(crop_file).convert('RGB')
                
                # Apply preprocessing transforms
                tensor = self.preprocess(img)
                crops_tensor_list.append(tensor)
                valid_crops.append(crop_file)
            except Exception as e:
                logger.warning(f"Failed to load crop {crop_file}: {e}")
                continue
        
        if not crops_tensor_list:
            raise RuntimeError("No valid crops to process")
        
        # Stack into batch tensor
        batch_tensor = torch.stack(crops_tensor_list).to(self.device)
        
        # Run inference
        with torch.no_grad():
            logits = model(batch_tensor)
            probabilities = torch.softmax(logits, dim=1)
        
        # Extract fake probabilities (Class 0 = FAKE, Class 1 = REAL)
        # CRITICAL: Use [:, 0] for fake class (as per notebook)
        fake_probs = probabilities[:, 0].cpu().numpy()
        
        logger.info(f"Processed {len(fake_probs)} crops, mean fake prob: {np.mean(fake_probs):.4f}")
        return fake_probs
    
    def process_video(
        self,
        video_file_content: bytes,
        filename: str,
        fps: int = 3,
        threshold: float = 0.85,
        aggregation_strategy: str = "confident",
        confident_t: float = 0.8,
        base_temp_dir: Optional[Path] = None
    ) -> Dict[str, Any]:
        """
        Process video for deepfake detection using V2 workflow.
        
        Args:
            video_file_content: Video file content as bytes
            filename: Original filename
            fps: Frames per second to extract (default: 3)
            threshold: Video-level classification threshold (default: 0.85)
            aggregation_strategy: Aggregation strategy ('confident' or 'simple', default: 'confident')
            confident_t: Threshold for confident strategy (default: 0.8)
            base_temp_dir: Base directory for temporary files (None = system temp)
        
        Returns:
            Dictionary with detection results
        """
        start_time = time.time()
        temp_video_path = None
        frames_dir = None
        crops_dir = None
        session_dir = None
        
        try:
            # Create temporary file for video
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
                temp_file.write(video_file_content)
                temp_video_path = temp_file.name
            
            # Create temporary directory structure
            frames_dir, crops_dir, session_dir = create_temp_processing_dir(base_temp_dir)
            
            # Extract video name
            video_name = Path(filename).stem
            
            # Step 1: Extract frames
            logger.info(f"Step 1: Extracting frames from {filename} at {fps} fps")
            frame_files = extract_frames_from_video(
                video_path=temp_video_path,
                output_dir=frames_dir,
                fps=fps,
                video_name=video_name
            )
            
            if not frame_files:
                raise RuntimeError("No frames were extracted from video")
            
            # Step 2: Crop faces
            logger.info(f"Step 2: Cropping faces from {len(frame_files)} frames")
            crop_files = crop_faces_from_frames(
                frame_files=frame_files,
                output_dir=crops_dir,
                enlarge_scale=1.3,
                jpeg_quality=95,
                video_name=video_name
            )
            
            if not crop_files:
                raise RuntimeError("No faces were detected in any frames")
            
            # Step 3: Batch predict
            logger.info(f"Step 3: Running batch prediction on {len(crop_files)} crops")
            fake_probs = self._predict_crops_batch(crop_files)
            
            # Step 4: Aggregate results
            logger.info(f"Step 4: Aggregating results using '{aggregation_strategy}' strategy")
            aggregation_func = get_aggregation_strategy(aggregation_strategy)
            
            if aggregation_strategy == "confident":
                aggregated_prob = aggregation_func(fake_probs, t=confident_t)
            else:
                aggregated_prob = aggregation_func(fake_probs, threshold=threshold)
            
            # Calculate statistics
            total_frames = len(fake_probs)
            fake_frames = np.sum(fake_probs >= threshold)
            real_frames = total_frames - fake_frames
            fake_ratio = fake_frames / total_frames if total_frames > 0 else 0.0
            
            # Determine final result
            if aggregated_prob >= threshold:
                final_result = DetectionResult.FAKE
            elif aggregated_prob < (1 - threshold):
                final_result = DetectionResult.REAL
            else:
                final_result = DetectionResult.UNCERTAIN
            
            # Calculate confidence
            confidence = max(aggregated_prob, 1 - aggregated_prob)
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            logger.info(
                f"Detection complete: {final_result.value} "
                f"(prob={aggregated_prob:.4f}, confidence={confidence:.4f}, "
                f"time={processing_time:.2f}s)"
            )
            
            return {
                "status": DetectionStatus.COMPLETED,
                "result": final_result,
                "confidence_score": confidence,
                "average_fake_probability": aggregated_prob,
                "fake_ratio": fake_ratio,
                "total_frames_processed": total_frames,
                "fake_frames": int(fake_frames),
                "real_frames": int(real_frames),
                "fps_used": fps,
                "threshold_used": threshold,
                "processing_time_seconds": processing_time,
                "frame_predictions": {
                    "frames": [
                        {
                            "frame_index": i,
                            "fake_probability": float(prob)
                        }
                        for i, prob in enumerate(fake_probs)
                    ]
                },
                "aggregation_strategy": aggregation_strategy,
                "error_message": None
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Video processing failed: {error_msg}", exc_info=True)
            return {
                "status": DetectionStatus.FAILED,
                "error_message": error_msg
            }
            
        finally:
            # Cleanup temporary files
            if temp_video_path and os.path.exists(temp_video_path):
                try:
                    os.unlink(temp_video_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temp video file: {e}")
            
            if session_dir:
                cleanup_temp_dir(session_dir)

