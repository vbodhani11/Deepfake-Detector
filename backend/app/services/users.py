from typing import Optional
import uuid
from app.models.repositories.users import UserRepository
from app.models.schemas.users import User, UserCreate, UserUpdate

class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Get user by ID"""
        return self.repository.get(user_id)

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.repository.get_by_email(email)

    def create_user(self, user_create: UserCreate) -> User:
        """Create a new user"""
        # Check if user already exists
        existing_user = self.repository.get_by_email(user_create.email)
        if existing_user:
            raise ValueError(f"User with email {user_create.email} already exists")

        return self.repository.create(user_create)

    def update_user(self, user_id: uuid.UUID, user_update: UserUpdate) -> User:
        """Update an existing user"""
        user = self.repository.get(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found")

        # Check if email is being updated and already exists
        if user_update.email and user_update.email != user.email:
            existing_user = self.repository.get_by_email(user_update.email)
            if existing_user:
                raise ValueError(f"User with email {user_update.email} already exists")

        return self.repository.update(user, user_update)

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user by email and password"""
        return self.repository.authenticate(email, password)
