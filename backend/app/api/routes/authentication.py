from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, SessionDep
from app.core import security
from app.core.config import settings
from app.models.entities.authentication import Token
from app.models.repositories.users import UserRepository
from app.services.users import UserService

router = APIRouter(prefix="/authentication", tags=["authentication"])

@router.post("/access-token")
def login_access_token(
    session: SessionDep, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    try:
        user_service = UserService(repository=UserRepository(session))
        user = user_service.authenticate_user(
            email=form_data.username, password=form_data.password
        )
        if not user:
            raise ValueError("Incorrect email or password")
        elif not user.is_active:
            raise ValueError("Inactive user")
        
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return Token(
            access_token=security.create_access_token(
                user.id, expires_delta=access_token_expires
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in login_access_token: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred during authentication")

@router.post("/test-token")
def test_token(current_user: CurrentUser) -> dict:
    """
    Test access token
    """
    return {"message": "Token is valid", "user_id": str(current_user.id)}
