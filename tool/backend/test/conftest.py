# tests/conftest.py
import pytest
import uuid
from aiohttp import ClientError
from datetime import datetime, timezone, timedelta
from sqlmodel import SQLModel, Session, create_engine
from src.models import RTITemplate, Institution
from src.models.response_models import RTITemplateRequest
from src.services.github_file_service import GithubFileService
from fastapi import UploadFile
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock
from src.services.auth_service import AuthService
from src.utils import http_client

# MockResponse class to simulate aiohttp responses
class MockResponse:
    def __init__(self, json_data, status=200):
        self._json_data = json_data
        self.status = status

    async def json(self):
        return self._json_data

    def raise_for_status(self):
        if self.status >= 400:
            raise ClientError("HTTP error")

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        pass

# Fixture to patch http_client.session with a fake session
@pytest.fixture
def patch_http_client_session():
    """Yield a mock session and patch http_client.session"""
    fake_session = MagicMock()
    with patch.object(type(http_client), "session", new_callable=PropertyMock) as mock_session_prop:
        mock_session_prop.return_value = fake_session
        yield fake_session

# fixtures for RTI Templates
@pytest.fixture
def in_memory_db():
    """Create an in-memory SQLite DB and provide a fresh session with test data."""
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    now = datetime.now(timezone.utc)
    
    templates = [
        RTITemplate(
            id=uuid.uuid4(),
            title="Template 1",
            description="Description 1",
            file="File content 1",
            created_at=now,
            updated_at=now,
        ),
        RTITemplate(
            id=uuid.uuid4(),
            title="Template 2",
            description="Description 2",
            file="File content 2",
            created_at=now,
            updated_at=now,
        ),
        RTITemplate(
            id=uuid.uuid4(),
            title="Template 3",
            description="Description 3",
            file="File content 3",
            created_at=now,
            updated_at=now,
        ),
    ]
    
    with Session(engine) as session:
        session.add_all(templates)
        session.commit()
        yield session


# fixtures for file service
@pytest.fixture
def make_upload_file():
    """Returns a factory for creating mock UploadFile instances."""
    def _factory(
        content: bytes = b"# Hello",
        content_type: str = "text/markdown",
        filename: str = "test.md",
    ):
        mock_file = AsyncMock(spec=UploadFile)
        mock_file.content_type = content_type
        mock_file.filename = filename
        mock_file.read = AsyncMock(return_value=content)
        return mock_file
    return _factory


@pytest.fixture
def make_github_content_file():
    """Returns a factory for GitHub ContentFile mock objects."""
    def _factory(path: str) -> MagicMock:
        content_file = MagicMock()
        content_file.path = path
        content_file.sha = "abc123sha"
        return content_file
    return _factory


@pytest.fixture
def make_file_service():
    """Returns a factory for mock GithubFileService instances with configurable upload/delete behaviour."""
    def _factory(
        relative_path: str = "rti-templates/test-uuid.md",
        absolute_path: str = "https://github.com/org/repo/blob/main/rti-templates/test-uuid.md",
        upload_side_effect=None,
        delete_return: bool = True,
    ) -> MagicMock:
        file_service = MagicMock()
        if upload_side_effect:
            file_service.upload_file = AsyncMock(side_effect=upload_side_effect)
        else:
            file_service.upload_file = AsyncMock(return_value={
                "relative_path": relative_path,
                "absolute_path": absolute_path,
            })
        file_service.delete_file = AsyncMock(return_value=delete_return)
        return file_service
    return _factory


@pytest.fixture
def make_template_request():
    """Returns a factory for mock RTITemplateRequest instances with a fake UploadFile."""
    def _factory(
        title: str = "Test Template",
        description: str = "A test description",
    ) -> MagicMock:
        mock_upload = AsyncMock()
        mock_upload.content_type = "text/markdown"
        mock_upload.filename = "test.md"
        mock_upload.read = AsyncMock(return_value=b"# Test")

        request = MagicMock(spec=RTITemplateRequest)
        request.title = title
        request.description = description
        request.file = mock_upload
        return request
    return _factory

@pytest.fixture
def institution_db():
    """Create an in-memory SQLite DB and provide a fresh session with test institutions."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    now = datetime.now(timezone.utc)
    
    institutions = [
        Institution(
            id=uuid.uuid4(),
            name="Institution 1",
            created_at=now - timedelta(hours=2),
            updated_at=now - timedelta(hours=2),
        ),
        Institution(
            id=uuid.uuid4(),
            name="Institution 2",
            created_at=now - timedelta(hours=1),
            updated_at=now - timedelta(hours=1),
        ),
        Institution(
            id=uuid.uuid4(),
            name="Institution 3",
            created_at=now,
            updated_at=now,
        ),
    ]
    
    with Session(engine) as session:
        session.add_all(institutions)
        session.commit()
        # We need to refresh objects if we want to use them after commit, 
        # but for tests we often just want the session.
        yield session