from sqlmodel import Session
from app.models.schemas.users import User, UserCreate
from app.models.repositories.users import UserRepository

def create_user(session: Session, user_create: UserCreate) -> User:
    """Create user using repository pattern"""
    repository = UserRepository(session)
    return repository.create(user_create)
