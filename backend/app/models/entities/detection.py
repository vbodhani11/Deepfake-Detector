from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.entities.common import BaseEntity
from app.models.entities.enums import DetectionStatus, MediaType, DetectionResult

class DetectionRequest(BaseModel):
    """Request model for deepfake detection"""
    model_config = ConfigDict(from_attributes=True)
    
    media_type: MediaType
    file_name: str

class DetectionResponse(BaseEntity):
    """Response model for deepfake detection results"""
    user_id: Optional[str] = None
    media_type: MediaType
    file_name: str
    file_path: str
    file_size: int
    status: DetectionStatus
    result: Optional[DetectionResult] = None
    confidence_score: Optional[float] = None
    processing_time_seconds: Optional[float] = None
    error_message: Optional[str] = None

class DetectionUpdate(BaseModel):
    """Update model for detection records"""
    status: Optional[DetectionStatus] = None
    result: Optional[DetectionResult] = None
    confidence_score: Optional[float] = None
    processing_time_seconds: Optional[float] = None
    error_message: Optional[str] = None

class DetectionListResponse(BaseModel):
    """Response model for listing detections"""
    detections: list[DetectionResponse]
    total: int
    page: int
    per_page: int
