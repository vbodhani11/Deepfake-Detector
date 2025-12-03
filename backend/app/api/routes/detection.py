import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query

from app.api.deps import CurrentUser, SessionDep, OptionalSessionDep, OptionalUser
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

# Try to import V2 service (may not be available if dependencies missing)
try:
    from app.services.detection_v2 import DetectionServiceV2
    DETECTION_V2_AVAILABLE = True
except ImportError as e:
    DETECTION_V2_AVAILABLE = False
    DetectionServiceV2 = None
    print(f"Warning: Detection V2 not available: {e}")

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
    threshold: Optional[float] = Form(None),  # None = use default for selected service
    save_report: bool = Form(False),
    aggregation_strategy: Optional[str] = Form(None),  # "confident" or "simple"
    current_user: OptionalUser = None,
) -> Any:
    """
    Public endpoint to analyze video for deepfakes

    - No authentication required for basic detection
    - If save_report=True, authentication is required
    - If authenticated and save_report=True, detection is linked to user
    """
    try:
        detection_service = None
        detection_repository = None
        if session is not None:
            detection_repository = DetectionRepository(session)
            detection_service = DetectionService(repository=detection_repository)
        else:
            detection_service = DetectionService()

        if save_report and current_user is None:
            raise HTTPException(
                status_code=401,
                detail=(
                    "Authentication required to save reports. "
                    "Please login or set save_report=false"
                ),
            )

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

        # Determine which service to use
        use_v2 = settings.USE_DETECTION_V2 and DETECTION_V2_AVAILABLE
        
        # Set default threshold based on service
        if threshold is None:
            if use_v2:
                threshold = settings.DETECTION_V2_THRESHOLD
            else:
                threshold = settings.DEFAULT_THRESHOLD
        
        # Validate threshold
        if threshold < 0.0 or threshold > 1.0:
            raise HTTPException(
                status_code=400, detail="Threshold must be between 0.0 and 1.0"
            )
        
        # Validate aggregation strategy if provided
        if aggregation_strategy and aggregation_strategy not in ["confident", "simple"]:
            raise HTTPException(
                status_code=400,
                detail="aggregation_strategy must be 'confident' or 'simple'"
            )
        
        # Set default aggregation strategy for V2
        if use_v2 and aggregation_strategy is None:
            aggregation_strategy = settings.DEFAULT_AGGREGATION_STRATEGY

        # Read file content into memory
        file_content = await file.read()
        file_size = len(file_content)

        user_id = current_user.id if (current_user and save_report) else None

        # Try to create detection entry in database (optional - for tracking)
        detection = None
        if session is not None:
            try:
                detection_create = DetectionCreate(
                    user_id=user_id,
                    media_type=MediaType.VIDEO,
                    file_name=file.filename,
                    file_path=None,
                    file_size=file_size,
                    status=DetectionStatus.PROCESSING,
                    fps_used=fps,
                    threshold_used=threshold,
                )

                detection = detection_service.create_detection(detection_create)
            except Exception as db_error:
                # Database not available - continue without storing detection record
                print(f"Database not available, processing without storage: {str(db_error)}")
                session = None
                detection_repository = None
                detection_service = DetectionService()

        # Process the video
        base_results = {
            "status": DetectionStatus.COMPLETED,
            "result": None,
            "confidence_score": None,
            "average_fake_probability": None,
            "fake_ratio": None,
            "total_frames_processed": None,
            "fake_frames": None,
            "real_frames": None,
            "fps_used": fps,
            "threshold_used": threshold,
            "processing_time_seconds": None,
            "frame_predictions": None,
            "error_message": None,
        }

        try:
            # Use V2 service if enabled and available
            if use_v2:
                try:
                    v2_service = DetectionServiceV2()
                    processing_results = v2_service.process_video(
                        video_file_content=file_content,
                        filename=file.filename,
                        fps=fps,
                        threshold=threshold,
                        aggregation_strategy=aggregation_strategy or settings.DEFAULT_AGGREGATION_STRATEGY,
                        confident_t=settings.CONFIDENT_STRATEGY_THRESHOLD,
                    )
                    results = {**base_results, **(processing_results or {})}
                except Exception as v2_error:
                    # Fallback to V1 if V2 fails
                    print(f"V2 processing failed, falling back to V1: {str(v2_error)}")
                    processing_results = detection_service.process_video(
                        video_file_content=file_content,
                        filename=file.filename,
                        fps=fps,
                        threshold=threshold,
                    )
                    results = {**base_results, **(processing_results or {})}
            else:
                # Use V1 service
                processing_results = detection_service.process_video(
                    video_file_content=file_content,
                    filename=file.filename,
                    fps=fps,
                    threshold=threshold,
                )
                results = {**base_results, **(processing_results or {})}
        except Exception as processing_error:
            print(f"Video processing failed: {str(processing_error)}")
            results = {
                **base_results,
                "status": DetectionStatus.FAILED,
                "error_message": str(processing_error),
            }

        # If database is available, update the detection record
        if detection and session is not None:
            try:
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

        # If no database record was created, create a response object directly
        if not detection:
            now = datetime.utcnow()
            detection_dict = {
                "id": uuid.uuid4(),
                "user_id": user_id,
                "media_type": MediaType.VIDEO,
                "file_name": file.filename,
                "file_path": None,
                "file_size": file_size,
                "status": DetectionStatus.COMPLETED,
                "result": None,
                "confidence_score": None,
                "average_fake_probability": None,
                "fake_ratio": None,
                "total_frames_processed": None,
                "fake_frames": None,
                "real_frames": None,
                "fps_used": fps,
                "threshold_used": threshold,
                "processing_time_seconds": None,
                "frame_predictions": None,
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
    file: UploadFile = File(...),
    media_type: MediaType = Form(...),
    description: Optional[str] = Form(None),
) -> Any:
    """
    Upload media file for deepfake detection (public endpoint, no authentication required).
    Detection is not stored in database - only stored when user logs in after detection.
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

        # Store file on disk
        from datetime import datetime
        import uuid
        from pathlib import Path
        
        file_size = file.size or 0
        detection_id = uuid.uuid4()
        
        # Create uploads directory structure
        uploads_dir = Path("uploads/anonymous")
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename to avoid conflicts
        file_extension_with_dot = f".{file_extension}" if file_extension else ""
        unique_filename = f"{detection_id}{file_extension_with_dot}"
        file_path = uploads_dir / unique_filename
        
        # Save file to disk
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Process video immediately (like Streamlit does)
        # Use V2 if enabled, otherwise V1
        use_v2 = settings.USE_DETECTION_V2 and DETECTION_V2_AVAILABLE
        
        # Process the video synchronously
        try:
            if use_v2:
                try:
                    v2_service = DetectionServiceV2()
                    processing_result = v2_service.process_video(
                        video_file_content=content,
                        filename=file.filename or "unknown",
                        fps=settings.DEFAULT_FPS,
                        threshold=settings.DETECTION_V2_THRESHOLD,
                        aggregation_strategy=settings.DEFAULT_AGGREGATION_STRATEGY,
                        confident_t=settings.CONFIDENT_STRATEGY_THRESHOLD,
                    )
                except Exception as v2_error:
                    # Fallback to V1 if V2 fails
                    print(f"V2 processing failed, falling back to V1: {str(v2_error)}")
                    from app.services.detection import DetectionService
                    service = DetectionService(repository=None)
                    processing_result = service.process_video(
                        video_file_content=content,
                        filename=file.filename or "unknown",
                        fps=settings.DEFAULT_FPS,
                        threshold=settings.DEFAULT_THRESHOLD
                    )
            else:
                from app.services.detection import DetectionService
                service = DetectionService(repository=None)
                processing_result = service.process_video(
                    video_file_content=content,
                    filename=file.filename or "unknown",
                    fps=settings.DEFAULT_FPS,
                    threshold=settings.DEFAULT_THRESHOLD
                )
            
            # Build response with actual results
            detection_dict = {
                "id": detection_id,
                "user_id": None,  # No user association for public uploads
                "media_type": media_type,
                "file_name": file.filename or "unknown",
                "file_path": str(file_path),
                "file_size": file_size,
                "status": processing_result.get("status", DetectionStatus.COMPLETED),
                "result": processing_result.get("result"),
                "confidence_score": processing_result.get("confidence_score"),
                "average_fake_probability": processing_result.get("average_fake_probability"),
                "fake_ratio": processing_result.get("fake_ratio"),
                "total_frames_processed": processing_result.get("total_frames_processed"),
                "fake_frames": processing_result.get("fake_frames"),
                "real_frames": processing_result.get("real_frames"),
                "fps_used": processing_result.get("fps_used"),
                "threshold_used": processing_result.get("threshold_used"),
                "processing_time_seconds": processing_result.get("processing_time_seconds"),
                "frame_predictions": processing_result.get("frame_predictions"),
                "error_message": processing_result.get("error_message"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow() if processing_result.get("status") == DetectionStatus.COMPLETED else None,
            }
        except Exception as e:
            # If processing fails, return error response
            detection_dict = {
                "id": detection_id,
                "user_id": None,
                "media_type": media_type,
                "file_name": file.filename or "unknown",
                "file_path": str(file_path),
                "file_size": file_size,
                "status": DetectionStatus.FAILED,
                "result": None,
                "confidence_score": None,
                "processing_time_seconds": None,
                "error_message": str(e),
                "created_at": datetime.utcnow(),
                "updated_at": None,
            }
        
        return DetectionResponse(**detection_dict)

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
    session: OptionalSessionDep,
) -> Any:
    """
    Get a specific detection record by ID (public endpoint, no authentication required).
    Since processing happens immediately on upload, this endpoint returns the detection status.
    If file exists, it means processing completed. Otherwise, detection not found.
    """
    try:
        from datetime import datetime
        
        # Check if file exists (means upload and processing completed)
        uploads_dir = Path("uploads/anonymous")
        # Try to find file with this detection ID
        matching_files = list(uploads_dir.glob(f"{detection_id}.*"))
        
        if matching_files:
            # File exists - processing was completed during upload
            file_path = matching_files[0]
            file_size = file_path.stat().st_size if file_path.exists() else 0
            file_name = file_path.name
            
            detection_dict = {
                "id": detection_id,
                "user_id": None,
                "media_type": "video",  # Default - could be improved
                "file_name": file_name,
                "file_path": str(file_path),
                "file_size": file_size,
                "status": DetectionStatus.COMPLETED,  # Processing completed during upload
                "result": None,  # Results were returned in upload response
                "confidence_score": None,
                "processing_time_seconds": None,
                "error_message": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        else:
            # File not found - detection doesn't exist
            raise ValueError(f"Detection with ID {detection_id} not found")
        
        return DetectionResponse(**detection_dict)

    except Exception as e:
        print(f"Error in get_detection_by_id: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred retrieving the detection",
        )

@router.get("/{detection_id}/file")
async def get_detection_file(
    detection_id: uuid.UUID,
) -> Any:
    """
    Serve the uploaded file (video/image) for a detection record.
    Public endpoint, no authentication required.
    """
    try:
        from fastapi.responses import FileResponse
        from pathlib import Path
        
        uploads_dir = Path("uploads/anonymous")
        matching_files = list(uploads_dir.glob(f"{detection_id}.*"))
        
        if not matching_files:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_path = matching_files[0]
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=str(file_path),
            media_type="video/mp4",  # Could be improved to detect actual type
            filename=file_path.name
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error serving file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error serving file")

@router.post("/{detection_id}/save", response_model=DetectionResponse)
def save_detection_report(
    detection_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Save anonymous detection to user account (requires authentication)

    Links an anonymous detection to the authenticated user's account
    so they can view it in their reports.
    """
    try:
        detection_service = DetectionService(
            repository=DetectionRepository(session)
        )

        # Save detection to user account
        detection = detection_service.save_detection_to_user(
            detection_id=detection_id,
            user_id=current_user.id,
        )

        return DetectionResponse(**detection.model_dump())

    except ValueError as e:
        # Business/validation errors: detection not found, belongs to another user, etc.
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        print(f"Error in save_detection_report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred saving the detection",
        )


@router.delete("/{detection_id}")
def delete_detection(
    detection_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Save anonymous detection to user account (requires authentication)

    Links an anonymous detection to the authenticated user's account
    so they can view it in their reports.
    """
    try:
        detection_service = DetectionService(
            repository=DetectionRepository(session)
        )

        # Save detection to user account
        detection = detection_service.save_detection_to_user(
            detection_id=detection_id,
            user_id=current_user.id,
        )

        return DetectionResponse(**detection.model_dump())

    except ValueError as e:
        # Business/validation errors: detection not found, belongs to another user, etc.
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        print(f"Error in save_detection_report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred saving the detection",
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
