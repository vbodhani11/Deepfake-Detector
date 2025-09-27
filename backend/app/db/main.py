from sqlalchemy import create_engine, select
from sqlmodel import Session
from app.core.config import settings
from app.models.schemas.users import User, UserCreate
from app import crud

# Build the complete database URI
database_uri = f"{str(settings.SQLALCHEMY_DATABASE_URI)}?sslmode={settings.POSTGRES_SSL_MODE}"

engine = create_engine(database_uri)

def init_db(session: Session) -> None:
    """Initialize the database with default data"""
    # Create superuser if one doesn't exist
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        user = crud.create_user(session=session, user_create=user_in)
