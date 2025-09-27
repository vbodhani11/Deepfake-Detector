import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, SessionDep
from app.models.entities.users import UserCreate, UserResponse, UserUpdate
from app.models.repositories.users import UserRepository
from app.services.users import UserService

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return UserResponse(**current_user.model_dump())

@router.post("/", response_model=UserResponse)
def create_user(*, session: SessionDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    try:
        user_service = UserService(repository=UserRepository(session))
        user = user_service.create_user(user_in)
        return UserResponse(**user.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in create_user: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred creating the user")

@router.patch("/me", response_model=UserResponse)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdate, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """
    try:
        user_service = UserService(repository=UserRepository(session))
        user = user_service.update_user(current_user.id, user_in)
        return UserResponse(**user.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in update_user_me: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred updating the user")

@router.get("/{user_id}", response_model=UserResponse)
def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    try:
        user_service = UserService(repository=UserRepository(session))
        user = user_service.get_user_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        # Users can only see their own profile unless they're superuser
        if user.id != current_user.id and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Not enough permissions")
            
        return UserResponse(**user.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in read_user_by_id: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred retrieving the user")
