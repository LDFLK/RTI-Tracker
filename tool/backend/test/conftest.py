# tests/conftest.py
import pytest
import uuid
from aiohttp import ClientError
from datetime import datetime, timezone, timedelta
from sqlmodel import SQLModel, Session, create_engine
from src.models import RTITemplate, Institution, Position
from src.models.request_models import RTITemplateRequest
from src.services.github_file_service import GithubFileService
from fastapi import UploadFile
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock
from src.services.auth_service import AuthService
from src.utils import http_client

from src.models.response_models import SenderResponse
from src.models.request_models import SenderRequest
from src.services import SenderService


FIXED_UUID = uuid.UUID("123e4567-e89b-12d3-a456-426614174000")
FIXED_NOW = datetime(2026, 3, 31, 9, 0, 0, tzinfo=timezone.utc)


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
    with patch.object(
        type(http_client), "session", new_callable=PropertyMock
    ) as mock_session_prop:
        mock_session_prop.return_value = fake_session
        yield fake_session


# fixtures for RTI Templates
@pytest.fixture
def rti_template_db():
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
        update_side_effect=None,
        delete_return: bool = True,
    ) -> MagicMock:
        file_service = MagicMock()
        
        # mock create_file
        if upload_side_effect:
            file_service.create_file = AsyncMock(side_effect=upload_side_effect)
        else:
            file_service.create_file = AsyncMock(return_value={
                "relative_path": relative_path,
                "absolute_path": absolute_path,
            })
            
        # mock update_file
        if update_side_effect:
            file_service.update_file = AsyncMock(side_effect=update_side_effect)
        else:
            file_service.update_file = AsyncMock(return_value={
                "relative_path": relative_path,
                "absolute_path": absolute_path,
            })

        file_service.delete_file = AsyncMock(return_value=delete_return)
        
        # mock read_file
        file_service.read_file = AsyncMock(return_value={
            "content": b"# Old Content",
            "sha": "old-sha"
        })
        
        # remove restore_file/recreate_file mocks since they are deleted

        return file_service

    return _factory


@pytest.fixture
def make_template_request():
    """Returns a factory for mock RTITemplateRequest instances with a fake UploadFile."""

    def _factory(
        title: str = "Test Template",
        description: str = "A test description",
        id: str = None
    ) -> MagicMock:
        mock_upload = AsyncMock()
        mock_upload.content_type = "text/markdown"
        mock_upload.filename = "test.md"
        mock_upload.read = AsyncMock(return_value=b"# Test")

        request = MagicMock(spec=RTITemplateRequest)
        request.id = id
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

@pytest.fixture
def position_db():
    """Create an in-memory SQLite DB and provide a fresh session with test positions."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    now = datetime.now(timezone.utc)
    
    positions = [
        Position(
            id=uuid.uuid4(),
            name="Position 1",
            created_at=now - timedelta(hours=2),
            updated_at=now - timedelta(hours=2),
        ),
        Position(
            id=uuid.uuid4(),
            name="Position 2",
            created_at=now - timedelta(hours=1),
            updated_at=now - timedelta(hours=1),
        ),
        Position(
            id=uuid.uuid4(),
            name="Position 3",
            created_at=now,
            updated_at=now,
        ),
    ]
    
    with Session(engine) as session:
        session.add_all(positions)
        session.commit()
        # We need to refresh objects if we want to use them after commit, 
        # but for tests we often just want the session.
        yield session

    

# sender fixtures 
@pytest.fixture
def make_sender_request():
    """Factory for SenderRequest instances."""

    def _factory(
        name: str = "John Doe",
        email: str | None = "john@example.com",
        address: str | None = "123 Main St, Colombo 01",
        contact_no: str | None = None,
    ) -> SenderRequest:
        return SenderRequest(
            name=name, email=email, address=address, contact_no=contact_no
        )

    return _factory


@pytest.fixture
def make_sender_response():
    """Factory for SenderResponse instances."""

    def _factory(
        id: uuid.UUID = FIXED_UUID,
        name: str = "John Doe",
        email: str | None = "john@example.com",
        address: str | None = "123 Main St, Colombo 01",
        contact_no: str | None = None,
    ) -> SenderResponse:
        return SenderResponse(
            id=id,
            name=name,
            email=email,
            address=address,
            contact_no=contact_no,
            created_at=FIXED_NOW,
            updated_at=FIXED_NOW,
        )

    return _factory


@pytest.fixture
def mock_sender_service():
    return MagicMock(spec=SenderService)
