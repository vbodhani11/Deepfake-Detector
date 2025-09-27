from typing import Optional
import uuid
from sqlmodel import Session, select
from app.models.schemas.users import User, UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password

class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, user_id: uuid.UUID) -> Optional[User]:
        """Get user by ID"""
        return self.session.get(User, user_id)

    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        statement = select(User).where(User.email == email)
        return self.session.exec(statement).first()

    def create(self, user_create: UserCreate) -> User:
        """Create a new user"""
        hashed_password = get_password_hash(user_create.password)
        db_obj = User(
            email=user_create.email,
            hashed_password=hashed_password,
            full_name=user_create.full_name,
            is_superuser=user_create.is_superuser,
        )
        self.session.add(db_obj)
        self.session.commit()
        self.session.refresh(db_obj)
        return db_obj

    def update(self, user: User, user_update: UserUpdate) -> User:
        """Update an existing user"""
        update_data = user_update.model_dump(exclude_unset=True)
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password

        for field, value in update_data.items():
            setattr(user, field, value)

        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def authenticate(self, email: str, password: str) -> Optional[User]:
        """Authenticate user by email and password"""
        user = self.get_by_email(email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
