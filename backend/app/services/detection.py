from typing import Optional, List
import uuid
from app.models.repositories.detection import DetectionRepository
from app.models.schemas.detection import Detection, DetectionCreate, DetectionUpdate
from app.models.entities.detection import DetectionListResponse, DetectionResponse
from app.models.entities.enums import DetectionStatus

class DetectionService:
    def __init__(self, repository: DetectionRepository):
        self.repository = repository

    def get_detection_by_id(self, detection_id: uuid.UUID) -> Optional[Detection]:
        """Get detection by ID"""
        return self.repository.get(detection_id)

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
