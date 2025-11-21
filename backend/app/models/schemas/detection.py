from datetime import datetime
from typing import Optional
import uuid
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON

from app.models.entities.enums import DetectionStatus, MediaType, DetectionResult

class DetectionBase(SQLModel):
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")  # Already nullable
    media_type: MediaType
    file_name: str = Field(max_length=255)
    file_path: Optional[str] = Field(default=None, max_length=500)
    file_size: int
    status: DetectionStatus = DetectionStatus.PENDING
    result: Optional[DetectionResult] = None
    confidence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    
    # New fields for detection results
    average_fake_probability: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    fake_ratio: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    total_frames_processed: Optional[int] = None
    fake_frames: Optional[int] = None
    real_frames: Optional[int] = None
    fps_used: Optional[int] = None
    threshold_used: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    processing_time_seconds: Optional[float] = None
    frame_predictions: Optional[dict] = Field(default=None, sa_column=Column(JSON))  # JSON field for frame-level data
    error_message: Optional[str] = None

class Detection(DetectionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

class DetectionCreate(DetectionBase):
    pass

class DetectionUpdate(SQLModel):
    status: Optional[DetectionStatus] = None
    result: Optional[DetectionResult] = None
    confidence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    average_fake_probability: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    fake_ratio: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    total_frames_processed: Optional[int] = None
    fake_frames: Optional[int] = None
    real_frames: Optional[int] = None
    fps_used: Optional[int] = None
    threshold_used: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    processing_time_seconds: Optional[float] = None
    frame_predictions: Optional[dict] = None
    error_message: Optional[str] = None
    user_id: Optional[uuid.UUID] = None
