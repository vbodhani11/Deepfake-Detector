import uuid
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query

from app.api.deps import CurrentUser, SessionDep
from app.models.entities.detection import DetectionRequest, DetectionResponse, DetectionListResponse
from app.models.entities.enums import MediaType, DetectionStatus
from app.models.repositories.detection import DetectionRepository
from app.models.schemas.detection import DetectionCreate
from app.services.detection import DetectionService
from app.core.config import settings

router = APIRouter(prefix="/detection", tags=["detection"])

@router.post("/upload", response_model=DetectionResponse)
async def upload_media_for_detection(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    media_type: MediaType = Form(...),
    description: Optional[str] = Form(None)
) -> Any:
    """
    Upload media file for deepfake detection.
    """
    try:
        # Validate file size
        if file.size and file.size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise ValueError(f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB")

        # Validate file extension
        file_extension = file.filename.split('.')[-1].lower() if file.filename else ""
        if media_type == MediaType.IMAGE:
            allowed_extensions = [ext.lstrip('.') for ext in settings.ALLOWED_IMAGE_EXTENSIONS]
        else:
            allowed_extensions = [ext.lstrip('.') for ext in settings.ALLOWED_VIDEO_EXTENSIONS]
        
        if file_extension not in allowed_extensions:
            raise ValueError(f"File extension '{file_extension}' not allowed for {media_type.value} files")

        # TODO: Implement file storage logic here
        # For now, we'll create a mock file path
        file_path = f"uploads/{current_user.id}/{file.filename}"
        file_size = file.size or 0

        detection_create = DetectionCreate(
            user_id=current_user.id,
            media_type=media_type,
            file_name=file.filename or "unknown",
            file_path=file_path,
            file_size=file_size,
            status=DetectionStatus.PENDING
        )

        detection_service = DetectionService(repository=DetectionRepository(session))
        detection = detection_service.create_detection(detection_create)
        
        return DetectionResponse(**detection.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in upload_media_for_detection: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred processing the upload")

@router.get("/", response_model=DetectionListResponse)
def get_user_detections(
    session: SessionDep,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
) -> Any:
    """
    Get user's detection history with pagination.
    """
    try:
        detection_service = DetectionService(repository=DetectionRepository(session))
        return detection_service.get_user_detections(current_user.id, page=page, per_page=per_page)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in get_user_detections: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred retrieving detections")

@router.get("/{detection_id}", response_model=DetectionResponse)
def get_detection_by_id(
    detection_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    Get a specific detection by ID.
    """
    try:
        detection_service = DetectionService(repository=DetectionRepository(session))
        detection = detection_service.get_detection_by_id(detection_id)
        
        if not detection:
            raise ValueError(f"Detection with ID {detection_id} not found")
        
        # Users can only see their own detections unless they're superuser
        if detection.user_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Not enough permissions")
            
        return DetectionResponse(**detection.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_detection_by_id: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred retrieving the detection")

@router.delete("/{detection_id}")
def delete_detection(
    detection_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    Delete a detection record.
    """
    try:
        detection_service = DetectionService(repository=DetectionRepository(session))
        detection = detection_service.get_detection_by_id(detection_id)
        
        if not detection:
            raise ValueError(f"Detection with ID {detection_id} not found")
        
        # Users can only delete their own detections unless they're superuser
        if detection.user_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Not enough permissions")
            
        success = detection_service.delete_detection(detection_id)
        if not success:
            raise Exception("Failed to delete detection")
            
        return {"message": "Detection deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in delete_detection: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred deleting the detection")
