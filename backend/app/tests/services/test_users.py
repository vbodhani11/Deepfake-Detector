import pytest
import uuid
from unittest.mock import MagicMock

from app.services.users import UserService
from app.models.repositories.users import UserRepository
from app.models.schemas.users import User, UserCreate, UserUpdate

@pytest.fixture
def mock_user_repository():
    return MagicMock(spec=UserRepository)

@pytest.fixture
def user_service(mock_user_repository):
    return UserService(repository=mock_user_repository)

@pytest.fixture
def sample_user():
    return User(
        id=uuid.uuid4(),
        email="test@example.com",
        hashed_password="hashed_password",
        full_name="Test User",
        is_active=True,
        is_superuser=False
    )

def test_get_user_by_id_success(user_service, mock_user_repository, sample_user):
    """Test successful user retrieval by ID"""
    user_id = sample_user.id
    mock_user_repository.get.return_value = sample_user
    
    result = user_service.get_user_by_id(user_id)
    
    assert result == sample_user
    mock_user_repository.get.assert_called_once_with(user_id)

def test_get_user_by_id_not_found(user_service, mock_user_repository):
    """Test user not found by ID"""
    user_id = uuid.uuid4()
    mock_user_repository.get.return_value = None
    
    result = user_service.get_user_by_id(user_id)
    
    assert result is None
    mock_user_repository.get.assert_called_once_with(user_id)

def test_create_user_success(user_service, mock_user_repository, sample_user):
    """Test successful user creation"""
    user_create = UserCreate(
        email="test@example.com",
        password="password123",
        full_name="Test User"
    )
    mock_user_repository.get_by_email.return_value = None
    mock_user_repository.create.return_value = sample_user
    
    result = user_service.create_user(user_create)
    
    assert result == sample_user
    mock_user_repository.get_by_email.assert_called_once_with("test@example.com")
    mock_user_repository.create.assert_called_once_with(user_create)

def test_create_user_already_exists(user_service, mock_user_repository, sample_user):
    """Test user creation when email already exists"""
    user_create = UserCreate(
        email="test@example.com",
        password="password123"
    )
    mock_user_repository.get_by_email.return_value = sample_user
    
    with pytest.raises(ValueError, match="User with email test@example.com already exists"):
        user_service.create_user(user_create)
    
    mock_user_repository.get_by_email.assert_called_once_with("test@example.com")
    mock_user_repository.create.assert_not_called()

def test_authenticate_user_success(user_service, mock_user_repository, sample_user):
    """Test successful user authentication"""
    email = "test@example.com"
    password = "password123"
    mock_user_repository.authenticate.return_value = sample_user
    
    result = user_service.authenticate_user(email, password)
    
    assert result == sample_user
    mock_user_repository.authenticate.assert_called_once_with(email, password)

def test_authenticate_user_invalid_credentials(user_service, mock_user_repository):
    """Test authentication with invalid credentials"""
    email = "test@example.com"
    password = "wrongpassword"
    mock_user_repository.authenticate.return_value = None
    
    result = user_service.authenticate_user(email, password)
    
    assert result is None
    mock_user_repository.authenticate.assert_called_once_with(email, password)
