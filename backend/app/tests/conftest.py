from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete
from unittest.mock import MagicMock

from app.core.config import settings
from app.main import app
from app.tests.utils.user import authentication_token_from_email
from app.tests.utils.utils import get_superuser_token_headers
from app.db.main import init_db, engine

# This fixture is used to create a new database session for each test function.
@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        init_db(session)
        yield session
        # Clean up after tests
        from app.models.schemas.detection import Detection
        from app.models.schemas.users import User

        # Delete all records in the correct order (child tables first)
        session.exec(delete(Detection))
        session.exec(delete(User))
        session.commit()

# This fixture is used to create a mock database session for each test function.
@pytest.fixture
def db_session():
    """
    Returns a mock database session for unit testing without database dependencies.
    """
    session = MagicMock()
    session.commit = MagicMock()
    session.refresh = MagicMock()
    session.add = MagicMock()
    return session

@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    return get_superuser_token_headers(client)

@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, email=settings.EMAIL_TEST_USER, db=db
    )
