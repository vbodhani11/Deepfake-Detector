from fastapi import APIRouter

from app.api.routes import authentication, users, detection
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(authentication.router)
api_router.include_router(users.router)
api_router.include_router(detection.router)
