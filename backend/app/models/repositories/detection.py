from typing import Optional, List
import uuid
from sqlmodel import Session, select, desc
from app.models.schemas.detection import Detection, DetectionCreate, DetectionUpdate

class DetectionRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, detection_id: uuid.UUID) -> Optional[Detection]:
        """Get detection by ID"""
        return self.session.get(Detection, detection_id)

    def get_by_user_id(self, user_id: uuid.UUID, limit: int = 100, offset: int = 0) -> List[Detection]:
        """Get detections by user ID with pagination"""
        statement = (
            select(Detection)
            .where(Detection.user_id == user_id)
            .order_by(desc(Detection.created_at))
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.exec(statement).all())

    def get_all(self, limit: int = 100, offset: int = 0) -> List[Detection]:
        """Get all detections with pagination"""
        statement = (
            select(Detection)
            .order_by(desc(Detection.created_at))
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.exec(statement).all())

    def create(self, detection_create: DetectionCreate) -> Detection:
        """Create a new detection record"""
        db_obj = Detection(**detection_create.model_dump())
        self.session.add(db_obj)
        self.session.commit()
        self.session.refresh(db_obj)
        return db_obj

    def update(self, detection: Detection, detection_update: DetectionUpdate) -> Detection:
        """Update an existing detection record"""
        update_data = detection_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(detection, field, value)

        self.session.add(detection)
        self.session.commit()
        self.session.refresh(detection)
        return detection

    def delete(self, detection_id: uuid.UUID) -> bool:
        """Delete a detection record"""
        detection = self.session.get(Detection, detection_id)
        if detection:
            self.session.delete(detection)
            self.session.commit()
            return True
        return False

    def count_by_user_id(self, user_id: uuid.UUID) -> int:
        """Count detections by user ID"""
        statement = select(Detection).where(Detection.user_id == user_id)
        return len(list(self.session.exec(statement).all()))

    def count_all(self) -> int:
        """Count all detections"""
        statement = select(Detection)
        return len(list(self.session.exec(statement).all()))
