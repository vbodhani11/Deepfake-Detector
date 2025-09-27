from datetime import datetime
from typing import Optional
import uuid
from sqlmodel import Field, SQLModel

from app.models.entities.enums import DetectionStatus, MediaType, DetectionResult

class DetectionBase(SQLModel):
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    media_type: MediaType
    file_name: str = Field(max_length=255)
    file_path: str = Field(max_length=500)
    file_size: int
    status: DetectionStatus = DetectionStatus.PENDING
    result: Optional[DetectionResult] = None
    confidence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    processing_time_seconds: Optional[float] = None
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
    processing_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
