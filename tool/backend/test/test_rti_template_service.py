# tests/test_rti_template_service.py
import uuid
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from sqlalchemy.exc import OperationalError, IntegrityError
from src.services.rti_template_service import RTITemplateService
from src.models.response_models import RTITemplateResponse
from src.core.exceptions import InternalServerException, BadRequestException, NotFoundException, ConflictException
from sqlmodel import SQLModel, Session, create_engine, select
from src.models import RTITemplate

@pytest.mark.asyncio
async def test_get_rti_templates_default(rti_template_db, make_file_service):
    absolute_url = "https://github.com/org/repo/blob/main/rti-templates/some-uuid.md"

    service = RTITemplateService(session=rti_template_db, file_service=make_file_service(absolute_path=absolute_url))
    response = service.get_rti_templates()
    
    assert response.pagination.page == 1
    assert response.pagination.pageSize == 10
    assert response.pagination.totalItem == 3
    assert response.pagination.totalPages == 1
    assert len(response.data) == 3

@pytest.mark.asyncio
async def test_get_rti_templates_custom_page(rti_template_db, make_file_service):
    absolute_url = "https://github.com/org/repo/blob/main/rti-templates/some-uuid.md"

    service = RTITemplateService(session=rti_template_db, file_service=make_file_service(absolute_path=absolute_url))
    response = service.get_rti_templates(page=2, page_size=2)
    
    assert response.pagination.page == 2
    assert response.pagination.pageSize == 2
    assert response.pagination.totalItem == 3
    assert response.pagination.totalPages == 2
    assert len(response.data) == 1  # Only one record left on page 2

@pytest.mark.asyncio
async def test_get_rti_templates_empty_db(make_file_service):
    """Test behavior when there are no templates in the database."""
    absolute_url = "https://github.com/org/repo/blob/main/rti-templates/some-uuid.md"

    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        service = RTITemplateService(session=session, file_service=make_file_service(absolute_path=absolute_url))
        response = service.get_rti_templates()
        
        assert response.pagination.page == 1
        assert response.pagination.totalItem == 0
        assert response.pagination.totalPages == 0
        assert response.data == []

@pytest.mark.asyncio
async def test_get_rti_templates_page_out_of_bounds(rti_template_db, make_file_service):
    """Requesting a page beyond total pages should return empty list."""
    absolute_url = "https://github.com/org/repo/blob/main/rti-templates/some-uuid.md"

    service = RTITemplateService(session=rti_template_db, file_service=make_file_service(absolute_path=absolute_url))
    response = service.get_rti_templates(page=10, page_size=2)
    
    assert response.pagination.page == 10
    assert response.data == []
    # totalPages still correctly reflects actual data
    assert response.pagination.totalPages == 2

@pytest.mark.asyncio
async def test_get_rti_templates_raises_internal_exception(monkeypatch, rti_template_db, make_file_service):
    """Simulate a database failure and ensure InternalServerException is raised."""
    absolute_url = "https://github.com/org/repo/blob/main/rti-templates/some-uuid.md"

    service = RTITemplateService(session=rti_template_db, file_service=make_file_service(absolute_path=absolute_url))
    
    # Monkeypatch the session.exec to raise an exception
    def fake_exec(*args, **kwargs):
        raise OperationalError("Fake DB failure", None, None)
    
    monkeypatch.setattr(rti_template_db, "exec", fake_exec)
    
    with pytest.raises(InternalServerException):
        await service.get_rti_templates()

# create_rti_template tests
@pytest.mark.asyncio
async def test_create_rti_template_success(rti_template_db, make_file_service, make_template_request):
    """Happy path: template is created and returned as RTITemplateResponse."""
    relative_path = "rti-templates/some-uuid.md"
    absolute_url = "https://github.com/org/repo/blob/main/rti-templates/some-uuid.md"

    service = RTITemplateService(session=rti_template_db, file_service=make_file_service(relative_path=relative_path, absolute_path=absolute_url))
    result = await service.create_rti_template(template_request=make_template_request(title="My RTI", description="Details"))

    assert isinstance(result, RTITemplateResponse)
    assert result.title == "My RTI"
    assert result.description == "Details"
    assert result.file == relative_path
    assert isinstance(result.id, uuid.UUID)

@pytest.mark.asyncio
async def test_create_rti_template_stores_relative_path_in_db(rti_template_db, make_file_service, make_template_request):
    """The relative GitHub path is persisted to the database."""
    relative_path = "rti-templates/stored.md"
    absolute_url = "https://github.com/org/repo/blob/main/rti-templates/stored.md"

    service = RTITemplateService(
        session=rti_template_db,
        file_service=make_file_service(relative_path=relative_path, absolute_path=absolute_url),
    )
    result = await service.create_rti_template(template_request=make_template_request(title="Stored URL Test"))

    db_record = rti_template_db.exec(select(RTITemplate).where(RTITemplate.id == result.id)).first()
    assert db_record is not None
    assert db_record.file == relative_path

@pytest.mark.asyncio
async def test_create_rti_template_calls_create_file(rti_template_db, make_file_service, make_template_request):
    """create_file is called exactly once with the generated UUID path and content."""
    fs = make_file_service()
    service = RTITemplateService(session=rti_template_db, file_service=fs)
    request = make_template_request()

    await service.create_rti_template(template_request=request)

    fs.create_file.assert_called_once()
    call_kwargs = fs.create_file.call_args.kwargs
    assert call_kwargs["content"] == b"# Test"
    assert "rti-templates/" in call_kwargs["file_path"]

@pytest.mark.asyncio
async def test_create_rti_template_without_description(rti_template_db, make_file_service, make_template_request):
    """Optional description can be None without breaking the creation flow."""
    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())

    request = make_template_request(title="No Description")
    request.description = None

    result = await service.create_rti_template(template_request=request)

    assert result.description is None
    assert result.title == "No Description"

@pytest.mark.asyncio
async def test_create_rti_template_raises_when_relative_path_empty(rti_template_db, make_file_service, make_template_request):
    """InternalServerException is raised when create_file returns empty relative_path."""
    service = RTITemplateService(
        session=rti_template_db,
        file_service=make_file_service(relative_path="", absolute_path="https://example.com/file.md"),
    )

    with pytest.raises(InternalServerException):
        await service.create_rti_template(template_request=make_template_request())

@pytest.mark.asyncio
async def test_create_rti_template_raises_when_absolute_path_empty(rti_template_db, make_file_service, make_template_request):
    """InternalServerException is raised when create_file returns empty absolute_path."""
    service = RTITemplateService(
        session=rti_template_db,
        file_service=make_file_service(relative_path="rti-templates/test.md", absolute_path=""),
    )

    with pytest.raises(InternalServerException):
        await service.create_rti_template(template_request=make_template_request())

@pytest.mark.asyncio
async def test_create_rti_template_raises_when_upload_fails(rti_template_db, make_file_service, make_template_request):
    """InternalServerException propagates when file upload itself raises."""
    service = RTITemplateService(
        session=rti_template_db,
        file_service=make_file_service(upload_side_effect=InternalServerException("Upload failed")),
    )

    with pytest.raises(InternalServerException):
        await service.create_rti_template(template_request=make_template_request())

@pytest.mark.asyncio
async def test_create_rti_template_does_not_call_delete_if_upload_failed(rti_template_db, make_file_service, make_template_request):
    """delete_file is NOT called when the upload itself fails — nothing to roll back."""
    fs = make_file_service(upload_side_effect=InternalServerException("Upload failed"))
    service = RTITemplateService(session=rti_template_db, file_service=fs)

    with pytest.raises(InternalServerException):
        await service.create_rti_template(template_request=make_template_request())

    fs.delete_file.assert_not_called()

@pytest.mark.asyncio
async def test_create_rti_template_calls_delete_file_on_db_failure(rti_template_db, monkeypatch, make_file_service, make_template_request):
    """delete_file is called as a compensating transaction when DB commit fails."""
    fs = make_file_service(relative_path="rti-templates/uuid.md")
    service = RTITemplateService(session=rti_template_db, file_service=fs)

    monkeypatch.setattr(rti_template_db, "commit", MagicMock(side_effect=Exception("DB commit error")))

    with pytest.raises(InternalServerException):
        await service.create_rti_template(template_request=make_template_request())

    fs.delete_file.assert_called_once_with(file_path="rti-templates/uuid.md")

@pytest.mark.asyncio
async def test_create_rti_template_rolls_back_session_on_failure(rti_template_db, monkeypatch, make_file_service, make_template_request):
    """session.rollback() is called when DB commit fails."""
    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())

    rollback_mock = MagicMock()
    monkeypatch.setattr(rti_template_db, "commit", MagicMock(side_effect=Exception("DB failure")))
    monkeypatch.setattr(rti_template_db, "rollback", rollback_mock)

    with pytest.raises(InternalServerException):
        await service.create_rti_template(template_request=make_template_request())

    rollback_mock.assert_called_once()
    
@pytest.mark.asyncio
async def test_create_rti_template_duplicate_title(rti_template_db, make_file_service, make_template_request):
    """Real DB unique-constraint collision on create raises ConflictException."""
    # Get an existing template's title
    existing_template = rti_template_db.exec(select(RTITemplate)).first()
    duplicate_title = existing_template.title

    fs = make_file_service()
    service = RTITemplateService(session=rti_template_db, file_service=fs)
    
    with pytest.raises(ConflictException) as exc:
        await service.create_rti_template(template_request=make_template_request(title=duplicate_title))
    
    assert "already exists" in str(exc.value)
    fs.delete_file.assert_called_once()

@pytest.mark.asyncio
async def test_create_rti_template_no_extension(rti_template_db, make_file_service, make_template_request):
    """BadRequestException is raised if the uploaded file has no extension."""
    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())
    
    request = make_template_request()
    request.file.filename = "no_extension_file"
    
    with pytest.raises(BadRequestException) as exc:
        await service.create_rti_template(template_request=request)
    
    assert "doesn't have any file extension" in str(exc.value)

# update_rti_template tests
@pytest.mark.asyncio
async def test_update_rti_template_success(rti_template_db, make_file_service, make_template_request):
    """Happy path: template title and description are updated."""
    # 1. pick an existing template ID from the rti_template_db fixture
    existing_template = rti_template_db.exec(select(RTITemplate)).first()
    template_id = str(existing_template.id)

    fs = make_file_service()
    service = RTITemplateService(session=rti_template_db, file_service=fs)

    # 2. create a request with new title/desc but NO file
    request = make_template_request(id=template_id, title="Updated Title", description="Updated Desc")
    request.file = None

    result = await service.update_rti_template(template_request=request)

    assert result.id == existing_template.id
    assert result.title == "Updated Title"
    assert result.description == "Updated Desc"
    fs.update_file.assert_not_called()

@pytest.mark.asyncio
async def test_update_rti_template_with_file(rti_template_db, make_file_service, make_template_request):
    """Updating a template with a new file calls the file service's update_file."""
    existing_template = rti_template_db.exec(select(RTITemplate)).first()
    template_id = str(existing_template.id)
    new_relative_path = "rti-templates/new-path.md"

    fs = make_file_service(relative_path=new_relative_path)
    service = RTITemplateService(session=rti_template_db, file_service=fs)

    request = make_template_request(id=template_id, title="New Title With File")
    
    result = await service.update_rti_template(template_request=request)

    assert result.title == "New Title With File"
    assert result.file == new_relative_path
    fs.update_file.assert_called_once()
    
@pytest.mark.asyncio
async def test_update_rti_template_not_found(rti_template_db, make_file_service, make_template_request):
    """NotFoundException is raised if the template ID doesn't exist in DB."""
    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())
    request = make_template_request(id=str(uuid.uuid4()))

    with pytest.raises(NotFoundException):
        await service.update_rti_template(template_request=request)

@pytest.mark.asyncio
async def test_update_rti_template_invalid_uuid(rti_template_db, make_file_service, make_template_request):
    """BadRequestException is raised if the ID is not a valid UUID string."""
    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())
    request = make_template_request(id="invalid-uuid")

    with pytest.raises(BadRequestException):
        await service.update_rti_template(template_request=request)

@pytest.mark.asyncio
async def test_update_rti_template_raises_when_file_service_fails(rti_template_db, make_file_service, make_template_request):
    """InternalServerException propagates when file service update fails."""
    existing_template = rti_template_db.exec(select(RTITemplate)).first()
    fs = make_file_service(update_side_effect=InternalServerException("File update failed"))
    service = RTITemplateService(session=rti_template_db, file_service=fs)
    request = make_template_request(id=str(existing_template.id))

    with pytest.raises(InternalServerException):
        await service.update_rti_template(template_request=request)

@pytest.mark.asyncio
async def test_update_rti_template_rolls_back_on_db_failure(rti_template_db, monkeypatch, make_file_service, make_template_request):
    """session.rollback() is called if the DB commit fails during update."""
    existing_template = rti_template_db.exec(select(RTITemplate)).first()
    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())
    
    rollback_mock = MagicMock()
    monkeypatch.setattr(rti_template_db, "commit", MagicMock(side_effect=Exception("DB fail during update")))
    monkeypatch.setattr(rti_template_db, "rollback", rollback_mock)

    request = make_template_request(id=str(existing_template.id), title="Should Rollback")
    
    with pytest.raises(InternalServerException):
        await service.update_rti_template(template_request=request)

    rollback_mock.assert_called_once()


@pytest.mark.asyncio
async def test_update_rti_template_rolls_back_file_on_db_failure(rti_template_db, monkeypatch, make_file_service, make_template_request):
    """update_file is called as a compensating transaction when DB commit fails during update."""
    existing_template = rti_template_db.exec(select(RTITemplate)).first()
    template_id = str(existing_template.id)
    
    # Mock file data for restoration
    old_content = b"# Old Content"
    old_sha = "old-sha"
    new_sha = "new-sha"
    
    fs = make_file_service()
    # Mock read_file to return different SHAs on successive calls
    fs.read_file = AsyncMock(side_effect=[
        {"content": old_content, "sha": old_sha}, # first call (old)
        {"content": b"# New Content", "sha": new_sha} # second call (new)
    ])
    
    service = RTITemplateService(session=rti_template_db, file_service=fs)
    
    # Mock DB failure
    monkeypatch.setattr(rti_template_db, "commit", MagicMock(side_effect=Exception("DB failure")))
    
    request = make_template_request(id=template_id, title="Fail Me")
    
    with pytest.raises(InternalServerException):
        await service.update_rti_template(template_request=request)
    
    # Verify update_file was called with the OLD content and the NEW sha to restore it
    fs.update_file.assert_called_with(
        file_path=existing_template.file,
        content=old_content,
        sha=new_sha,
        message=f"Rollback: restore previous version of {existing_template.file}"
    )

@pytest.mark.asyncio
async def test_update_rti_template_duplicate_title(rti_template_db, make_file_service, make_template_request):
    """Real DB unique-constraint collision on update raises ConflictException."""
    templates = rti_template_db.exec(select(RTITemplate)).all()
    target_template = templates[0]          # The template we will try to update
    duplicate_title = templates[1].title    # A title that already belongs to another template

    old_content = b"# Old Content"
    old_sha = "old-sha"
    new_sha = "new-sha"
    
    fs = make_file_service()
    fs.read_file = AsyncMock(side_effect=[
        {"content": old_content, "sha": old_sha}, # first call (old)
        {"content": b"# New Content", "sha": new_sha} # second call (new)
    ])
    
    service = RTITemplateService(session=rti_template_db, file_service=fs)

    request = make_template_request(id=str(target_template.id), title=duplicate_title)
    
    with pytest.raises(ConflictException) as exc:
        await service.update_rti_template(template_request=request)
    
    assert "already exists" in str(exc.value)
    
    # Verify compensating transaction (rollback)
    fs.update_file.assert_called_with(
        file_path=target_template.file,
        content=old_content,
        sha=new_sha,
        message=f"Rollback: restore previous version of {target_template.file}"
    )

# delete_rti_template tests
@pytest.mark.asyncio
async def test_delete_rti_template_success(rti_template_db, make_file_service):
    """Happy path: template and its file are deleted."""
    existing_template = rti_template_db.exec(select(RTITemplate)).first()
    template_id = existing_template.id
    file_path = existing_template.file

    fs = make_file_service()
    service = RTITemplateService(session=rti_template_db, file_service=fs)

    await service.delete_rti_template(template_id=str(template_id))

    # Verify DB deletion
    db_record = rti_template_db.exec(select(RTITemplate).where(RTITemplate.id == template_id)).first()
    assert db_record is None
    # Verify File deletion
    fs.delete_file.assert_called_once_with(file_path=file_path)

@pytest.mark.asyncio
async def test_delete_rti_template_not_found(rti_template_db, make_file_service):
    """NotFoundException is raised if the template ID doesn't exist."""
    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())
    random_id = str(uuid.uuid4())

    with pytest.raises(NotFoundException):
        await service.delete_rti_template(template_id=random_id)

@pytest.mark.asyncio
async def test_delete_rti_template_invalid_uuid(rti_template_db, make_file_service):
    """BadRequestException is raised for malformed UUID strings."""
    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())

    with pytest.raises(BadRequestException):
        await service.delete_rti_template(template_id="not-a-uuid")

@pytest.mark.asyncio
async def test_delete_rti_template_integrity_error(rti_template_db, make_file_service, monkeypatch):
    """IntegrityError triggers rollback and recreates the file on GitHub."""
    existing_template = rti_template_db.exec(select(RTITemplate)).first()
    template_id = existing_template.id
    
    fs = make_file_service()
    fs.read_file = AsyncMock(return_value={"content": b"Content", "sha": "sha"})
    fs.create_file = AsyncMock(return_value=True)
    
    service = RTITemplateService(session=rti_template_db, file_service=fs)
    
    # Mock commit to raise IntegrityError
    monkeypatch.setattr(rti_template_db, "commit", MagicMock(side_effect=IntegrityError("Conflict", None, None)))
    
    with pytest.raises(ConflictException):
        await service.delete_rti_template(template_id=str(template_id))
    
    # Verify compensating transaction
    fs.create_file.assert_called_once_with(
        file_path=existing_template.file, 
        content=b"Content",
        message=f"Recreate file {existing_template.file}"
    )

@pytest.mark.asyncio
async def test_delete_rti_template_generic_exception(rti_template_db, make_file_service, monkeypatch):
    """Generic exception triggers rollback and recreates the file."""
    existing_template = rti_template_db.exec(select(RTITemplate)).first()
    template_id = existing_template.id
    
    fs = make_file_service()
    fs.read_file = AsyncMock(return_value={"content": b"Content", "sha": "sha"})
    fs.create_file = AsyncMock(return_value=True)
    
    service = RTITemplateService(session=rti_template_db, file_service=fs)
    
    # Mock delete to raise Exception
    monkeypatch.setattr(rti_template_db, "delete", MagicMock(side_effect=Exception("Unexpected error")))
    
    with pytest.raises(InternalServerException):
        await service.delete_rti_template(template_id=str(template_id))
    
    fs.create_file.assert_called_once_with(
        file_path=existing_template.file, 
        content=b"Content",
        message=f"Recreate file {existing_template.file}"
    )

# get_rti_template_by_id tests
@pytest.mark.asyncio
async def test_get_rti_template_by_id_success(rti_template_db, make_file_service):
    """Happy path: template is retrieved by ID."""
    existing_template = rti_template_db.exec(select(RTITemplate)).first()
    template_id = str(existing_template.id)

    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())
    result = service.get_rti_template_by_id(template_id=template_id)

    assert isinstance(result, RTITemplateResponse)
    assert result.id == existing_template.id
    assert result.title == existing_template.title

@pytest.mark.asyncio
async def test_get_rti_template_by_id_invalid_uuid(rti_template_db, make_file_service):
    """BadRequestException is raised for invalid UUID strings."""
    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())
    
    with pytest.raises(BadRequestException) as exc:
        service.get_rti_template_by_id(template_id="not-a-uuid")
    assert "Invalid UUID format" in str(exc.value)

@pytest.mark.asyncio
async def test_get_rti_template_by_id_not_found(rti_template_db, make_file_service):
    """NotFoundException is raised if the ID doesn't exist."""
    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())
    random_id = str(uuid.uuid4())

    with pytest.raises(NotFoundException) as exc:
        service.get_rti_template_by_id(template_id=random_id)
    assert "not found" in str(exc.value)

@pytest.mark.asyncio
async def test_get_rti_template_by_id_internal_error(rti_template_db, make_file_service, monkeypatch):
    """InternalServerException is raised on generic failure."""
    existing_template = rti_template_db.exec(select(RTITemplate)).first()
    template_id = str(existing_template.id)

    service = RTITemplateService(session=rti_template_db, file_service=make_file_service())
    
    # Mock session.get to raise an exception
    monkeypatch.setattr(rti_template_db, "get", MagicMock(side_effect=Exception("DB breakdown")))
    
    with pytest.raises(InternalServerException) as exc:
        service.get_rti_template_by_id(template_id=template_id)
    assert "Failed to read RTI template" in str(exc.value)
    