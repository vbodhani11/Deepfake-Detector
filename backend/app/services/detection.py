import os
import sys
import time
import uuid
import tempfile
from pathlib import Path
from typing import Optional, List

from app.core.config import settings
from app.models.repositories.detection import DetectionRepository
from app.models.schemas.detection import Detection, DetectionCreate, DetectionUpdate
from app.models.entities.detection import DetectionListResponse, DetectionResponse
from app.models.entities.enums import DetectionStatus, DetectionResult

# Add model directory to Python path
model_src_path = Path(__file__).parent.parent.parent.parent / "model" / "src"
if str(model_src_path) not in sys.path:
    sys.path.insert(0, str(model_src_path))

# Try to import the ML pipeline, but allow server to start without it
try:
    from deepfake_detector import DeepfakeDetectorPipeline  # type: ignore[import]
    ML_MODEL_AVAILABLE = True
except ImportError as e:
    DeepfakeDetectorPipeline = None
    ML_MODEL_AVAILABLE = False
    print(f"Warning: ML model dependencies not available: {e}")
    print("Server will start but detection features will be limited.")


class DetectionService:
    def __init__(self, repository: Optional[DetectionRepository] = None):
        self.repository = repository
        self.pipeline = None
    
    def _get_pipeline(self) -> Optional[DeepfakeDetectorPipeline]:
        """Get or initialize pipeline (singleton pattern)"""
        if not ML_MODEL_AVAILABLE:
            raise ImportError("ML model dependencies are not available. Please install opencv-python and other ML dependencies.")
        
        if self.pipeline is None:
            model_path = Path(settings.MODEL_PATH)
            if not model_path.is_absolute():
                # Make path relative to project root
                project_root = Path(__file__).parent.parent.parent.parent
                model_path = project_root / model_path
            
            if not model_path.exists():
                raise FileNotFoundError(f"Model not found at {model_path}")
            
            self.pipeline = DeepfakeDetectorPipeline()
            print(f"Pipeline initialized with model: {model_path}")
        
        return self.pipeline
    
    def process_video(
        self, 
        video_file_content: bytes,
        filename: str,
        fps: int = 3,
        threshold: float = 0.5
    ) -> dict:
        """
        Process video for deepfake detection
        
        Args:
            video_file_content: Video file content as bytes
            filename: Original filename
            fps: Frames per second to extract
            threshold: Decision threshold
        
        Returns:
            Dictionary with detection results
        """
        start_time = time.time()
        temp_file_path = None
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
                temp_file.write(video_file_content)
                temp_file_path = temp_file.name
            
            # Get pipeline and process video
            pipeline = self._get_pipeline()
            model_path = Path(settings.MODEL_PATH)
            if not model_path.is_absolute():
                project_root = Path(__file__).parent.parent.parent.parent
                model_path = project_root / model_path
            
            # Run detection
            result = pipeline.predict_video(str(temp_file_path), str(model_path), fps=fps)
            
            # Check for errors in pipeline response
            if "error" in result:
                raise Exception(result["error"])
            
            # Extract results
            average_fake_prob = result.get("average_fake_probability", 0.0)
            fake_ratio = result.get("fake_ratio", 0.0)
            total_frames = result.get("total_frames_processed", 0)
            fake_frames = result.get("fake_frames", 0)
            real_frames = result.get("real_frames", 0)
            frame_predictions = result.get("frame_predictions", [])
            
            # Determine final result
            if average_fake_prob >= threshold:
                final_result = DetectionResult.FAKE
            elif average_fake_prob < (1 - threshold):
                final_result = DetectionResult.REAL
            else:
                final_result = DetectionResult.UNCERTAIN
            
            # Calculate confidence (higher of fake or real probability)
            confidence = max(average_fake_prob, 1 - average_fake_prob)
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            return {
                "status": DetectionStatus.COMPLETED,
                "result": final_result,
                "confidence_score": confidence,
                "average_fake_probability": average_fake_prob,
                "fake_ratio": fake_ratio,
                "total_frames_processed": total_frames,
                "fake_frames": fake_frames,
                "real_frames": real_frames,
                "fps_used": fps,
                "threshold_used": threshold,
                "processing_time_seconds": processing_time,
                "frame_predictions": {"frames": frame_predictions} if frame_predictions else None,
                "error_message": None
            }
            
        except FileNotFoundError as e:
            error_msg = f"Model not found: {str(e)}"
            return {
                "status": DetectionStatus.FAILED,
                "error_message": error_msg
            }
            
        except Exception as e:
            error_msg = str(e)
            return {
                "status": DetectionStatus.FAILED,
                "error_message": error_msg
            }
            
        finally:
            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception as e:
                    print(f"Failed to delete temp file: {str(e)}")

    def get_detection_by_id(self, detection_id: uuid.UUID) -> Optional[Detection]:
        """Get detection by ID"""
        return self.repository.get(detection_id)

    def save_detection_to_user(
        self,
        detection_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Detection:
        """ Link anonymous detection to user account """
        if not self.repository:
            raise ValueError("Repository not available. Database connection required.")

        detection = self.repository.get(detection_id)
        if not detection:
            raise ValueError(f"Detection with ID {detection_id} not found")

        # Detection already belongs to some *other* user
        if detection.user_id is not None and detection.user_id != user_id:
            raise ValueError("Detection already belongs to another user")

        # Already linked to this user – idempotent, just return
        if detection.user_id == user_id:
            return detection

        # Update user_id using DetectionUpdate
        detection_update = DetectionUpdate(user_id=user_id)
        detection = self.repository.update(detection, detection_update)

        return detection


    def get_user_detections(self, user_id: uuid.UUID, page: int = 1, per_page: int = 20) -> DetectionListResponse:
        """Get detections for a specific user with pagination"""
        if page < 1:
            raise ValueError("Page number must be greater than 0")
        if per_page < 1 or per_page > 100:
            raise ValueError("Per page must be between 1 and 100")

        offset = (page - 1) * per_page
        detections = self.repository.get_by_user_id(user_id, limit=per_page, offset=offset)
        total = self.repository.count_by_user_id(user_id)

        detection_responses = [
            DetectionResponse(**detection.model_dump()) for detection in detections
        ]

        return DetectionListResponse(
            detections=detection_responses,
            total=total,
            page=page,
            per_page=per_page
        )

    def get_all_detections(self, page: int = 1, per_page: int = 20) -> DetectionListResponse:
        """Get all detections with pagination"""
        if page < 1:
            raise ValueError("Page number must be greater than 0")
        if per_page < 1 or per_page > 100:
            raise ValueError("Per page must be between 1 and 100")

        offset = (page - 1) * per_page
        detections = self.repository.get_all(limit=per_page, offset=offset)
        total = self.repository.count_all()

        detection_responses = [
            DetectionResponse(**detection.model_dump()) for detection in detections
        ]

        return DetectionListResponse(
            detections=detection_responses,
            total=total,
            page=page,
            per_page=per_page
        )

    def create_detection(self, detection_create: DetectionCreate) -> Detection:
        """Create a new detection record"""
        return self.repository.create(detection_create)

    def update_detection(self, detection_id: uuid.UUID, detection_update: DetectionUpdate) -> Detection:
        """Update an existing detection record"""
        detection = self.repository.get(detection_id)
        if not detection:
            raise ValueError(f"Detection with ID {detection_id} not found")

        return self.repository.update(detection, detection_update)

    def delete_detection(self, detection_id: uuid.UUID) -> bool:
        """Delete a detection record"""
        detection = self.repository.get(detection_id)
        if not detection:
            raise ValueError(f"Detection with ID {detection_id} not found")

        return self.repository.delete(detection_id)

    def start_detection_processing(self, detection_id: uuid.UUID) -> Detection:
        """Mark detection as processing"""
        detection_update = DetectionUpdate(status=DetectionStatus.PROCESSING)
        return self.update_detection(detection_id, detection_update)
