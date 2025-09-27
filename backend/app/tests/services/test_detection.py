import pytest
import uuid
from unittest.mock import MagicMock

from app.services.detection import DetectionService
from app.models.repositories.detection import DetectionRepository
from app.models.schemas.detection import Detection, DetectionCreate, DetectionUpdate
from app.models.entities.enums import DetectionStatus, MediaType, DetectionResult

@pytest.fixture
def mock_detection_repository():
    return MagicMock(spec=DetectionRepository)

@pytest.fixture
def detection_service(mock_detection_repository):
    return DetectionService(repository=mock_detection_repository)

@pytest.fixture
def sample_detection():
    return Detection(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        media_type=MediaType.IMAGE,
        file_name="test.jpg",
        file_path="/uploads/test.jpg",
        file_size=1024,
        status=DetectionStatus.COMPLETED,
        result=DetectionResult.FAKE,
        confidence_score=0.95
    )

def test_get_detection_by_id_success(detection_service, mock_detection_repository, sample_detection):
    """Test successful detection retrieval by ID"""
    detection_id = sample_detection.id
    mock_detection_repository.get.return_value = sample_detection
    
    result = detection_service.get_detection_by_id(detection_id)
    
    assert result == sample_detection
    mock_detection_repository.get.assert_called_once_with(detection_id)

def test_get_detection_by_id_not_found(detection_service, mock_detection_repository):
    """Test detection not found by ID"""
    detection_id = uuid.uuid4()
    mock_detection_repository.get.return_value = None
    
    result = detection_service.get_detection_by_id(detection_id)
    
    assert result is None
    mock_detection_repository.get.assert_called_once_with(detection_id)

def test_create_detection_success(detection_service, mock_detection_repository, sample_detection):
    """Test successful detection creation"""
    detection_create = DetectionCreate(
        user_id=uuid.uuid4(),
        media_type=MediaType.IMAGE,
        file_name="test.jpg",
        file_path="/uploads/test.jpg",
        file_size=1024
    )
    mock_detection_repository.create.return_value = sample_detection
    
    result = detection_service.create_detection(detection_create)
    
    assert result == sample_detection
    mock_detection_repository.create.assert_called_once_with(detection_create)

def test_update_detection_success(detection_service, mock_detection_repository, sample_detection):
    """Test successful detection update"""
    detection_id = sample_detection.id
    detection_update = DetectionUpdate(
        status=DetectionStatus.COMPLETED,
        result=DetectionResult.REAL,
        confidence_score=0.85
    )
    mock_detection_repository.get.return_value = sample_detection
    mock_detection_repository.update.return_value = sample_detection
    
    result = detection_service.update_detection(detection_id, detection_update)
    
    assert result == sample_detection
    mock_detection_repository.get.assert_called_once_with(detection_id)
    mock_detection_repository.update.assert_called_once_with(sample_detection, detection_update)

def test_update_detection_not_found(detection_service, mock_detection_repository):
    """Test detection update when detection not found"""
    detection_id = uuid.uuid4()
    detection_update = DetectionUpdate(status=DetectionStatus.COMPLETED)
    mock_detection_repository.get.return_value = None
    
    with pytest.raises(ValueError, match=f"Detection with ID {detection_id} not found"):
        detection_service.update_detection(detection_id, detection_update)
    
    mock_detection_repository.get.assert_called_once_with(detection_id)
    mock_detection_repository.update.assert_not_called()

def test_get_user_detections_invalid_page(detection_service):
    """Test get user detections with invalid page number"""
    user_id = uuid.uuid4()
    
    with pytest.raises(ValueError, match="Page number must be greater than 0"):
        detection_service.get_user_detections(user_id, page=0)

def test_get_user_detections_invalid_per_page(detection_service):
    """Test get user detections with invalid per_page value"""
    user_id = uuid.uuid4()
    
    with pytest.raises(ValueError, match="Per page must be between 1 and 100"):
        detection_service.get_user_detections(user_id, per_page=101)
