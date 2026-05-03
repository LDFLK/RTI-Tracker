# tests/conftest.py
import pytest
import uuid
from aiohttp import ClientError
from datetime import datetime, timezone, timedelta
from sqlmodel import SQLModel, Session, create_engine
from src.models import RTITemplate, Institution, Position, Receiver, ReceiverRequest, ReceiverUpdateRequest, RTIRequest, RTIStatus, RTIStatusHistories, RTIStatusName
from src.models.request_models import RTITemplateRequest, PositionRequest
from src.services.github_file_service import GithubFileService
from fastapi import UploadFile
from sqlalchemy import event
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock
from src.utils import http_client
from src.models import Sender
from src.models.response_models import SenderResponse
from src.models.request_models import SenderRequest, InstitutionRequest, RTIRequestRequest, RTIRequestUpdateRequest
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

# institutions fixures
@pytest.fixture
def make_institution_request():
    """Returns a factory for mock InstitutionRequest instance"""

    def _factory(
        name: str = "Test Institution"
    ) -> MagicMock:
        request = MagicMock(spec=InstitutionRequest)
        request.name = name 
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


# receiver fixtures
@pytest.fixture
def receiver_db():
    """Create an in-memory SQLite DB and provide a fresh session with test receivers."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    SQLModel.metadata.create_all(engine)
    now = datetime.now(timezone.utc)
    
    pos1 = Position(id=uuid.uuid4(), name="Position 1", created_at=now, updated_at=now)
    inst1 = Institution(id=uuid.uuid4(), name="Institution 1", created_at=now, updated_at=now)

    receivers = [
        Receiver(
            id=uuid.uuid4(),
            position=pos1,
            institution=inst1,
            email="receiver1@example.com",
            created_at=now - timedelta(hours=2),
            updated_at=now - timedelta(hours=2),
        ),
        Receiver(
            id=uuid.uuid4(),
            position=pos1,
            institution=inst1,
            email="receiver2@example.com",
            created_at=now - timedelta(hours=1),
            updated_at=now - timedelta(hours=1),
        ),
        Receiver(
            id=uuid.uuid4(),
            position=pos1,
            institution=inst1,
            email="receiver3@example.com",
            created_at=now,
            updated_at=now,
        ),
    ]
    
    with Session(engine) as session:
        session.add(pos1)
        session.add(inst1)
        session.add_all(receivers)
        session.commit()
        yield session

@pytest.fixture
def make_receiver_request():
    """Factory for ReceiverRequest instances."""

    def _factory(
        position_id: uuid.UUID,
        institution_id: uuid.UUID,
        email: str | None = "new@example.com",
        address: str | None = "New Address",
        contact_no: str | None = "0771234568",
    ) -> ReceiverRequest:
        return ReceiverRequest(
            positionId=position_id,
            institutionId=institution_id,
            email=email,
            address=address,
            contactNo=contact_no
        )

    return _factory

@pytest.fixture
def make_receiver_update_request():
    """Factory for ReceiverUpdateRequest instances."""

    def _factory(
        position_id: uuid.UUID | None = None,
        institution_id: uuid.UUID | None = None,
        email: str | None = None,
        address: str | None = None,
        contact_no: str | None = None,
    ) -> ReceiverUpdateRequest:
        # Use dict and then parse to handle exclude_unset=True in model_dump
        data = {}
        if position_id is not None: data["positionId"] = position_id
        if institution_id is not None: data["institutionId"] = institution_id
        if email is not None: data["email"] = email
        if address is not None: data["address"] = address
        if contact_no is not None: data["contactNo"] = contact_no
        
        return ReceiverUpdateRequest(**data)

    return _factory

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
def sender_db():
    """In-memory DB seeded with three Sender rows for service-level tests."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    now = datetime.now(timezone.utc)

    senders = [
        Sender(
            id=uuid.uuid4(),
            name="Alice",
            email="alice@example.com",
            address="1 Alpha St",
            contact_no=None,
            created_at=now - timedelta(hours=2),
            updated_at=now - timedelta(hours=2),
        ),
        Sender(
            id=uuid.uuid4(),
            name="Bob",
            email=None,
            address="2 Beta Ave",
            contact_no="0771111111",
            created_at=now - timedelta(hours=1),
            updated_at=now - timedelta(hours=1),
        ),
        Sender(
            id=uuid.uuid4(),
            name="Carol",
            email="carol@example.com",
            address=None,
            contact_no="0772222222",
            created_at=now,
            updated_at=now,
        ),
    ]

    with Session(engine) as session:
        session.add_all(senders)
        session.commit()
        yield session

@pytest.fixture
def make_position_request():
    """Factory for PositionRequest instances."""

    def _factory(name: str = "Test Position") -> MagicMock:
        request = MagicMock(spec=PositionRequest)
        request.name = name
        return request

    return _factory

@pytest.fixture
def mock_sender_service():
    return MagicMock(spec=SenderService)

@pytest.fixture
def rti_request_db():
    """Create an in-memory SQLite DB and provide a fresh session with seeded data."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        
    SQLModel.metadata.create_all(engine)
    now = datetime.now(timezone.utc)

    # 1. Seed Status
    status_created = RTIStatus(id=uuid.uuid4(), name=RTIStatusName.CREATED, created_at=now, updated_at=now)
    
    # 2. Seed Sender
    sender = Sender(
        id=uuid.uuid4(),
        name="Test Sender",
        email="sender@example.com",
        created_at=now,
        updated_at=now
    )
    
    # 3. Seed Receiver structure
    pos = Position(id=uuid.uuid4(), name="Test Position", created_at=now, updated_at=now)
    inst = Institution(id=uuid.uuid4(), name="Test Institution", created_at=now, updated_at=now)
    receiver = Receiver(
        id=uuid.uuid4(),
        position_id=pos.id,
        institution_id=inst.id,
        email="receiver@example.com",
        created_at=now,
        updated_at=now
    )

    with Session(engine) as session:
        session.add(status_created)
        session.add(sender)
        session.add(pos)
        session.add(inst)
        session.add(receiver)
        session.commit()
        # Refresh to ensure IDs are available
        session.refresh(status_created)
        session.refresh(sender)
        session.refresh(receiver)
        yield session

@pytest.fixture
def make_rti_request_request():
    """Returns a factory for mock RTIRequestRequest instances with a fake UploadFile."""
    def _factory(
        title: str = "Test RTI Request",
        description: str = "Test Description",
        sender_id: uuid.UUID = None,
        receiver_id: uuid.UUID = None,
        rti_template_id: uuid.UUID = None,
        filename: str = "test.pdf",
        content_type: str = "application/pdf"
    ):
        mock_file = AsyncMock()
        mock_file.filename = filename
        mock_file.content_type = content_type
        mock_file.read = AsyncMock(return_value=b"fake pdf content")

        request = MagicMock(spec=RTIRequestRequest)
        request.title = title
        request.description = description
        request.sender_id = sender_id or uuid.uuid4()
        request.receiver_id = receiver_id or uuid.uuid4()
        request.rti_template_id = rti_template_id
        request.file = mock_file
        return request
    return _factory

@pytest.fixture
def make_rti_request_update_request():
    """Returns a factory for mock RTIRequestUpdateRequest instances."""
    def _factory(
        id: str = None,
        title: str = None,
        description: str = None,
        sender_id: uuid.UUID = None,
        receiver_id: uuid.UUID = None,
        rti_template_id: uuid.UUID = None,
        filename: str = None,
        content_type: str = "application/pdf"
    ):
        request = RTIRequestUpdateRequest(
            id=id or str(uuid.uuid4()),
            title=title,
            description=description,
            sender_id=sender_id,
            receiver_id=receiver_id,
            rti_template_id=rti_template_id
        )
        
        # Manually set __pydantic_fields_set__ to simulate 'unset' fields if necessary
        # However, initializing with named args already sets them in __pydantic_fields_set__.
        # To simulate 'unset', we should only pass what we want to be 'set'.
        
        fields = {}
        if id: fields["id"] = id
        if title: fields["title"] = title
        if description: fields["description"] = description
        if sender_id: fields["sender_id"] = sender_id
        if receiver_id: fields["receiver_id"] = receiver_id
        if rti_template_id: fields["rti_template_id"] = rti_template_id
        
        # Re-initialize with only the provided fields to ensure exclude_unset works
        request = RTIRequestUpdateRequest(**fields)
        if not id:
            request.id = str(uuid.uuid4()) # Ensure ID is always set for service fetch

        if filename:
            mock_file = AsyncMock(spec=UploadFile)
            mock_file.filename = filename
            mock_file.content_type = content_type
            mock_file.read = AsyncMock(return_value=b"updated content")
            request.file = mock_file
            request.__pydantic_fields_set__.add("file")
        else:
            request.file = None
            
        return request
    return _factory

