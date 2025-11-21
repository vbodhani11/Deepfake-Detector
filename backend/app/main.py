import sentry_sdk
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.responses import RedirectResponse
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings


def custom_generate_unique_id(route: APIRoute) -> str:
    tag = route.tags[0] if route.tags else "root"
    return f"{tag}-{route.name}"


# Enable Sentry only when deployed
if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


# CORS
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# API routes
app.include_router(api_router, prefix=settings.API_V1_STR)
