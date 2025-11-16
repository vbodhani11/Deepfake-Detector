import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query

from app.api.deps import CurrentUser, SessionDep, OptionalSessionDep
from app.models.entities.detection import (
    DetectionRequest,
    DetectionResponse,
    DetectionListResponse,
)
from app.models.entities.enums import MediaType, DetectionStatus
from app.models.repositories.detection import DetectionRepository
from app.models.schemas.detection import DetectionCreate, DetectionUpdate
from app.services.detection import DetectionService
from app.core.config import settings

router = APIRouter(prefix="/detection", tags=["detection"])


# -------------------------------------------------------------
# ✅ PUBLIC ANALYZE ENDPOINT (NO AUTH) — Task 1.4 Integration
# -------------------------------------------------------------
@router.post("/analyze", response_model=DetectionResponse)
async def analyze_video(
    *,
    session: OptionalSessionDep,
    file: UploadFile = File(...),
    fps: int = Form(settings.DEFAULT_FPS),
    threshold: float = Form(settings.DEFAULT_THRESHOLD),
) -> Any:
    """
    Public endpoint to analyze video for deepfakes (no authentication required)

    Processes video immediately and returns results.
    Video is not stored — processed in memory and discarded.
    """
    try:
        # Validate file size
        if file.size and file.size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"File size ({file.size / 1024 / 1024:.2f}MB) exceeds maximum "
                    f"allowed size of {settings.MAX_FILE_SIZE_MB}MB"
                ),
            )

        # Validate filename
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

        # Validate file extension
        file_extension = Path(file.filename).suffix.lower()
        allowed_extensions = [ext.lower() for ext in settings.ALLOWED_VIDEO_EXTENSIONS]

        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"File extension '{file_extension}' not allowed. "
                    f"Allowed: {', '.join(settings.ALLOWED_VIDEO_EXTENSIONS)}"
                ),
            )

        # Validate FPS
        if fps < 1 or fps > 10:
            raise HTTPException(status_code=400, detail="FPS must be between 1 and 10")

        # Validate threshold
        if threshold < 0.0 or threshold > 1.0:
            raise HTTPException(
                status_code=400, detail="Threshold must be between 0.0 and 1.0"
            )

        # Read file content into memory
        file_content = await file.read()
        file_size = len(file_content)

        # Try to create detection entry in database (optional - for tracking)
        detection = None
        if session is not None:
            try:
                detection_create = DetectionCreate(
                    user_id=None,
                    media_type=MediaType.VIDEO,
                    file_name=file.filename,
                    file_path=None,
                    file_size=file_size,
                    status=DetectionStatus.PROCESSING,
                )

                detection_service = DetectionService(
                    repository=DetectionRepository(session)
                )

                detection = detection_service.create_detection(detection_create)
            except Exception as db_error:
                # Database not available - continue without storing detection record
                print(f"Database not available, processing without storage: {str(db_error)}")
                session = None

        # Process the video
        try:
            # TODO: Implement actual video processing logic
            # For now, return a mock response
            results = {
                "status": DetectionStatus.COMPLETED,
                "result": None,  # Will be set by actual processing
                "confidence_score": None,
                "processing_time_seconds": None,
                "error_message": None,
            }

            # If database is available, update the detection record
            if detection and session is not None:
                try:
                    detection_service = DetectionService(
                        repository=DetectionRepository(session)
                    )
                    detection_update = DetectionUpdate(**results)
                    detection = detection_service.update_detection(
                        detection.id, detection_update
                    )
                except Exception as db_error:
                    print(f"Could not update detection in database: {str(db_error)}")
                    # Create a response from the detection object we have
                    detection_dict = detection.model_dump()
                    detection_dict.update(results)
                    detection = type('Detection', (), detection_dict)()

        except Exception as e:
            # If database is available, update status to failed
            if detection and session is not None:
                try:
                    detection_service = DetectionService(
                        repository=DetectionRepository(session)
                    )
                    detection_update = DetectionUpdate(
                        status=DetectionStatus.FAILED,
                        error_message=str(e),
                    )
                    detection = detection_service.update_detection(
                        detection.id, detection_update
                    )
                except Exception:
                    pass
            raise HTTPException(
                status_code=500, detail=f"Error processing video: {str(e)}"
            )

        # If no database record was created, create a response object directly
        if not detection:
            now = datetime.utcnow()
            detection_dict = {
                "id": uuid.uuid4(),
                "user_id": None,
                "media_type": MediaType.VIDEO,
                "file_name": file.filename,
                "file_path": None,
                "file_size": file_size,
                "status": DetectionStatus.COMPLETED,
                "result": None,
                "confidence_score": None,
                "processing_time_seconds": None,
                "error_message": None,
                "created_at": now,
                "updated_at": now,
            }
            detection_dict.update(results)
            # Create a simple object that can be converted to DetectionResponse
            class TempDetection:
                def model_dump(self):
                    return detection_dict
            detection = TempDetection()

        return DetectionResponse(**detection.model_dump())

    except HTTPException:
        raise

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        print(f"Error in analyze_video: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred processing the video",
        )


# -------------------------------------------------------------
# EXISTING AUTHENTICATED ENDPOINTS (UNCHANGED)
# -------------------------------------------------------------

@router.post("/upload", response_model=DetectionResponse)
async def upload_media_for_detection(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    media_type: MediaType = Form(...),
    description: Optional[str] = Form(None),
) -> Any:
    """
    Upload media file for deepfake detection (authenticated).
    """
    try:
        # Validate file size
        if file.size and file.size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise ValueError(
                f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB"
            )

        # Validate file extension
        file_extension = (
            file.filename.split(".")[-1].lower() if file.filename else ""
        )
        if media_type == MediaType.IMAGE:
            allowed_extensions = [
                ext.lstrip(".") for ext in settings.ALLOWED_IMAGE_EXTENSIONS
            ]
        else:
            allowed_extensions = [
                ext.lstrip(".") for ext in settings.ALLOWED_VIDEO_EXTENSIONS
            ]

        if file_extension not in allowed_extensions:
            raise ValueError(
                f"File extension '{file_extension}' not allowed for {media_type.value} files"
            )

        file_path = f"uploads/{current_user.id}/{file.filename}"
        file_size = file.size or 0

        detection_create = DetectionCreate(
            user_id=current_user.id,
            media_type=media_type,
            file_name=file.filename or "unknown",
            file_path=file_path,
            file_size=file_size,
            status=DetectionStatus.PENDING,
        )

        detection_service = DetectionService(
            repository=DetectionRepository(session)
        )
        detection = detection_service.create_detection(detection_create)

        return DetectionResponse(**detection.model_dump())

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        print(f"Error in upload_media_for_detection: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred processing the upload",
        )


@router.get("/", response_model=DetectionListResponse)
def get_user_detections(
    session: SessionDep,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
) -> Any:
    """
    Get authenticated user's detection history.
    """
    try:
        detection_service = DetectionService(
            repository=DetectionRepository(session)
        )
        return detection_service.get_user_detections(
            current_user.id, page=page, per_page=per_page
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        print(f"Error in get_user_detections: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred retrieving detections",
        )


@router.get("/{detection_id}", response_model=DetectionResponse)
def get_detection_by_id(
    detection_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Get a specific detection record by ID.
    """
    try:
        detection_service = DetectionService(
            repository=DetectionRepository(session)
        )
        detection = detection_service.get_detection_by_id(detection_id)

        if not detection:
            raise ValueError(f"Detection with ID {detection_id} not found")

        if (
            detection.user_id != current_user.id
            and not current_user.is_superuser
        ):
            raise HTTPException(
                status_code=403, detail="Not enough permissions"
            )

        return DetectionResponse(**detection.model_dump())

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except HTTPException:
        raise

    except Exception as e:
        print(f"Error in get_detection_by_id: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred retrieving the detection",
        )


@router.delete("/{detection_id}")
def delete_detection(
    detection_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Delete a detection record.
    """
    try:
        detection_service = DetectionService(
            repository=DetectionRepository(session)
        )
        detection = detection_service.get_detection_by_id(detection_id)

        if not detection:
            raise ValueError(f"Detection with ID {detection_id} not found")

        if (
            detection.user_id != current_user.id
            and not current_user.is_superuser
        ):
            raise HTTPException(
                status_code=403, detail="Not enough permissions"
            )

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
        raise HTTPException(
            status_code=500,
            detail="An error occurred deleting the detection",
        )
