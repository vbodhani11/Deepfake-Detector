from typing import Annotated
from collections.abc import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from pydantic import ValidationError
from sqlmodel import Session
from app.core import security
from app.db.main import engine
from app.models.entities.authentication import TokenPayload
from app.models.schemas.users import User
from app.core.config import settings
from jwt.exceptions import InvalidTokenError

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/authentication/access-token"
)

# Dependency to get the database session
def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get the database session.
    """
    with Session(engine) as session:
        yield session

# Optional database session that handles connection errors gracefully
def get_db_optional() -> Generator[Session | None, None, None]:
    """
    Dependency to get the database session, returns None if connection fails.
    """
    session = None
    try:
        # Try to create a session - this will fail if DB is not available
        session = Session(engine)
        # Test the connection
        session.connection()
        yield session
    except Exception:
        # Database not available - return None
        if session:
            try:
                session.close()
            except Exception:
                pass
        yield None
    finally:
        if session:
            try:
                session.close()
            except Exception:
                pass

SessionDep = Annotated[Session, Depends(get_db)]
OptionalSessionDep = Annotated[Session | None, Depends(get_db_optional)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]

# Dependency to get the current user from the token
def get_current_user(session: SessionDep, token: TokenDep) -> User:
    """
    Dependency to get the current user from the token.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

def get_current_active_superuser(current_user: CurrentUser) -> User:
    """
    Dependency to check if the current user is an active superuser.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user
