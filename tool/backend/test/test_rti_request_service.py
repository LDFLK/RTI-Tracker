# tests/test_rti_request_service.py
import uuid
import pytest
import re
from unittest.mock import MagicMock, AsyncMock, patch
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy import event
from sqlmodel import SQLModel, Session, create_engine, select
from datetime import datetime, timezone

from src.services.rti_request_service import RTIRequestService
from src.models.table_schemas.table_schemas import (
    RTIRequest, RTIStatus, RTIStatusHistories, RTIDirection, 
    Sender, Receiver, Position, Institution
)
from src.models.request_models.rti_requests import RTIRequestRequest
from src.models.response_models.rti_requests import RTIRequestResponse
from src.core.exceptions import (
    InternalServerException, BadRequestException, 
    NotFoundException, ConflictException
)

# test create rti request
@pytest.mark.asyncio
async def test_create_rti_request_success(rti_request_db, make_file_service, make_rti_request_request):
    """Happy path: RTI Request is created along with status history."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    fs = make_file_service(relative_path="rti-requests/dir/file.pdf")
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    request = make_rti_request_request(
        sender_id=sender.id,
        receiver_id=receiver.id,
        title="My Sample RTI Request"
    )
    
    result = await service.create_rti_request(request_data=request)
    
    assert isinstance(result, RTIRequestResponse)
    assert result.title == "My Sample RTI Request"
    assert result.sender.id == sender.id
    assert result.receiver.id == receiver.id
    
    # Check if RTIRequest record exists
    db_request = rti_request_db.exec(select(RTIRequest).where(RTIRequest.id == result.id)).first()
    assert db_request is not None
    
    # Check if RTIStatusHistories record exists
    db_history = rti_request_db.exec(select(RTIStatusHistories).where(RTIStatusHistories.rti_request_id == result.id)).first()
    assert db_history is not None
    assert db_history.direction == RTIDirection.sent
    assert db_history.files == ["rti-requests/dir/file.pdf"]
    
    # Verify file service was called
    fs.create_file.assert_called_once()

@pytest.mark.asyncio
async def test_create_rti_request_invalid_file_extension(rti_request_db, make_file_service, make_rti_request_request):
    """BadRequestException raised for unsupported file extensions."""
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    request = make_rti_request_request(filename="test.exe")
    
    with pytest.raises(BadRequestException) as exc:
        await service.create_rti_request(request_data=request)
    assert "valid extension" in str(exc.value)

@pytest.mark.asyncio
async def test_create_rti_request_missing_created_status(rti_request_db, make_file_service, make_rti_request_request):
    """InternalServerException raised when 'CREATED' status is missing from DB."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    # Delete the CREATED status
    rti_request_db.exec(select(RTIStatus).where(RTIStatus.name == "CREATED")).first()
    rti_request_db.delete(rti_request_db.exec(select(RTIStatus).where(RTIStatus.name == "CREATED")).first())
    rti_request_db.commit()
    
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    
    with pytest.raises(InternalServerException) as exc:
        await service.create_rti_request(request_data=request)
    assert "Status 'CREATED' not found" in str(exc.value)

@pytest.mark.asyncio
async def test_create_rti_request_db_failure_rolls_back(rti_request_db, monkeypatch, make_file_service, make_rti_request_request):
    """Verifies rollback and GitHub file deletion on DB commit failure."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    relative_path = "rti-requests/fail/file.pdf"
    fs = make_file_service(relative_path=relative_path)
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    # Mock commit failure
    monkeypatch.setattr(rti_request_db, "commit", MagicMock(side_effect=Exception("DB Error")))
    rollback_mock = MagicMock()
    monkeypatch.setattr(rti_request_db, "rollback", rollback_mock)
    
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    
    with pytest.raises(InternalServerException):
        await service.create_rti_request(request_data=request)
    
    rollback_mock.assert_called_once()
    fs.delete_file.assert_called_once_with(file_path=relative_path)

@pytest.mark.asyncio
async def test_create_rti_request_integrity_error(rti_request_db, make_file_service, make_rti_request_request):
    """ConflictException raised on IntegrityError (e.g. Foreign Key violation)."""
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    # Use a non-existent sender_id to trigger a Foreign Key violation
    non_existent_sender_id = uuid.uuid4()
    
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    request = make_rti_request_request(sender_id=non_existent_sender_id, receiver_id=receiver.id)
    
    with pytest.raises(ConflictException):
        await service.create_rti_request(request_data=request)

@pytest.mark.asyncio
async def test_create_rti_request_without_description(rti_request_db, make_file_service, make_rti_request_request):
    """Optional description can be None without breaking the creation flow."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id, title="No Desc")
    request.description = None
    
    result = await service.create_rti_request(request_data=request)
    assert result.description is None
    assert result.title == "No Desc"

# test get rti request
@pytest.mark.asyncio
async def test_get_rti_requests_success(rti_request_db, make_file_service, make_rti_request_request):
    """Verifies fetching paginated RTI Requests."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    fs = make_file_service()
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    # Create 3 RTI requests
    for i in range(3):
        request = make_rti_request_request(
            sender_id=sender.id,
            receiver_id=receiver.id,
            title=f"RTI Request {i}"
        )
        await service.create_rti_request(request_data=request)
    
    # Test fetching with page_size=2
    response = service.get_rti_requests(page=1, page_size=2)
    
    assert len(response.data) == 2
    assert response.pagination.totalItem == 3
    assert response.pagination.totalPages == 2
    assert response.pagination.page == 1
    assert response.pagination.pageSize == 2

@pytest.mark.asyncio
async def test_get_rti_requests_empty_db(make_file_service):
    """Test behavior when there are no requests in the database."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        service = RTIRequestService(session=session, file_service=make_file_service())
        response = service.get_rti_requests()
        
        assert response.pagination.page == 1
        assert response.pagination.totalItem == 0
        assert response.pagination.totalPages == 0
        assert response.data == []

@pytest.mark.asyncio
async def test_get_rti_requests_page_out_of_bounds(rti_request_db, make_file_service):
    """Requesting a page beyond total pages should return empty list."""
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    response = service.get_rti_requests(page=10, page_size=2)
    
    assert response.pagination.page == 10
    assert response.data == []

@pytest.mark.asyncio
async def test_get_rti_requests_internal_error(rti_request_db, monkeypatch, make_file_service):
    """Simulate a database failure during listing and ensure InternalServerException is raised."""
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    def fake_exec(*args, **kwargs):
        raise OperationalError("Fake DB failure", None, None)
    
    monkeypatch.setattr(rti_request_db, "exec", fake_exec)
    
    with pytest.raises(InternalServerException):
        service.get_rti_requests()




