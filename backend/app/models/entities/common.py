from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict

class TimestampMixin(BaseModel):
    """Base model with timestamp fields"""
    created_at: datetime
    updated_at: Optional[datetime] = None

class BaseEntity(TimestampMixin):
    """Base entity with common fields"""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
