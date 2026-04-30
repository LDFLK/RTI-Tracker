# tests/test_institution_service.py
import pytest
from pydantic import ValidationError
from sqlalchemy.exc import OperationalError, IntegrityError
from src.services.institution_service import InstitutionService
from src.models.response_models import InstitutionListResponse
from src.models.request_models import InstitutionRequest
from src.core.exceptions import InternalServerException, ConflictException, BadRequestException, NotFoundException
from sqlmodel import SQLModel, Session, create_engine
from uuid import uuid4

# get institutions list tests
def test_get_institutions_default(institution_db):
    """Test fetching institutions with default pagination (page 1, size 10)."""
    service = InstitutionService(session=institution_db)
    response = service.get_institutions()
    
    assert isinstance(response, InstitutionListResponse)
    assert response.pagination.page == 1
    assert response.pagination.pageSize == 10
    assert response.pagination.totalItem == 3
    assert response.pagination.totalPages == 1
    assert len(response.data) == 3
    # verify sorting order (descending by created_at)
    # Institution 3 (now) should be first, Institution 1 (now - 2h) should be last
    assert response.data[0].name == "Institution 3"
    assert response.data[1].name == "Institution 2"
    assert response.data[2].name == "Institution 1"

def test_get_institutions_custom_pagination(institution_db):
    """Test fetching institutions with custom page and page size."""
    service = InstitutionService(session=institution_db)
    response = service.get_institutions(page=2, page_size=2)
    
    assert response.pagination.page == 2
    assert response.pagination.pageSize == 2
    assert response.pagination.totalItem == 3
    assert response.pagination.totalPages == 2
    assert len(response.data) == 1  # Only 1 record left for page 2

def test_get_institutions_empty_db():
    """Test behavior when no institutions exist in the database."""
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        service = InstitutionService(session=session)
        response = service.get_institutions()
        
        assert response.pagination.totalItem == 0
        assert response.pagination.totalPages == 0
        assert response.data == []

def test_get_institutions_db_error(monkeypatch, institution_db):
    """Test that InternalServerException is raised when a database error occurs."""
    service = InstitutionService(session=institution_db)
    
    # Mock the session to raise an error during execution
    def mock_exec(*args, **kwargs):
        raise OperationalError("Fake DB error", None, None)
    
    monkeypatch.setattr(institution_db, "exec", mock_exec)
    
    with pytest.raises(InternalServerException) as excinfo:
        service.get_institutions()
    
    assert "Failed to fetch Institutions from database" in str(excinfo.value)

# create institutions test
def test_create_institutions_success(institution_db, make_institution_request):
    """Create institution success"""

    service = InstitutionService(session=institution_db)

    request = make_institution_request(name="Test Institution")

    result = service.create_institution(request=request)

    assert result.name == "Test Institution"

def test_create_institutions_internal_server_error(monkeypatch, institution_db, make_institution_request):
    """Test Internal Server Error exception raising when exception happen"""

    service = InstitutionService(session=institution_db)

    request = make_institution_request(name="Test Institution")

    def mock_commit(*args, **kwargs):
        raise OperationalError("Fake DB error", None, None)

    monkeypatch.setattr(institution_db, "commit", mock_commit)

    with pytest.raises(InternalServerException) as excinfo:
        service.create_institution(request=request)

    assert "Failed to create Institution" in str(excinfo.value)    

def test_create_institutions_conflict_error(institution_db, make_institution_request):
    """Test raise Conflict Exception when the db try to create duplicate record with the same name"""

    service = InstitutionService(session=institution_db)

    request_1 = make_institution_request(name="Test Institution")
    request_2 = make_institution_request(name="Test Institution")

    # first service call
    result_1 = service.create_institution(request=request_1)

    assert result_1.name == "Test Institution"

    # second service call with the same institution name
    with pytest.raises(ConflictException) as excinfo:
        service.create_institution(request=request_2)

    assert "Institution with this name already exists" in str(excinfo.value)

def test_create_institutions_with_empty_name(institution_db):
    """Test raise Validation Error when pass an empty name"""

    service = InstitutionService(session=institution_db)

    with pytest.raises(ValidationError) as excinfo:
        request = InstitutionRequest(name="")
        service.create_institution(request=request)

    assert "String should have at least 1 character" in str(excinfo.value)

# get institution by id test
def test_get_institution_by_id_success(institution_db, make_institution_request):
    """Get Institution by ID success"""
    service = InstitutionService(session=institution_db)
    request = make_institution_request(name="Test Institution")

    # create institution
    create_result = service.create_institution(request=request)

    # get institution
    read_result = service.get_institution(institution_id=create_result.id)

    assert read_result.name == create_result.name
    assert read_result.id == create_result.id
    assert read_result.created_at == create_result.created_at
    assert read_result.updated_at == create_result.updated_at

def test_get_institution_invalid_id(institution_db):
    """Test read institution by invalid id"""

    service = InstitutionService(session=institution_db)

    with pytest.raises(BadRequestException) as exeinfo:
        service.get_institution(institution_id="")
    
    assert "Invalid UUID format" in str(exeinfo.value)

def test_get_institution_not_found(institution_db):
    """Test get institution not found"""
    service = InstitutionService(session=institution_db)
    random_id = str(uuid4())

    with pytest.raises(NotFoundException) as excinfo:
        service.get_institution(institution_id=random_id)
        
    assert f"Institution with id {random_id} not found." in str(excinfo.value)

def test_get_institution_internal_server_error(monkeypatch, institution_db):
    """Test get institution raises internal server error"""
    service = InstitutionService(session=institution_db)
    
    def mock_get(*args, **kwargs):
        raise OperationalError("Fake DB error", None, None)
        
    monkeypatch.setattr(institution_db, "get", mock_get)
    
    random_id = str(uuid4())
    
    with pytest.raises(InternalServerException) as excinfo:
        service.get_institution(institution_id=random_id)
        
    assert "Failed to read Institution" in str(excinfo.value)

# update institution test
def test_update_institution_success(institution_db, make_institution_request):
    """Test update institution success"""
    service = InstitutionService(session=institution_db)
    
    # Create an institution first
    create_request = make_institution_request(name="Old Name")
    created_institution = service.create_institution(request=create_request)
    
    # Update the institution
    update_request = make_institution_request(name="New Name")
    updated_institution = service.update_institution(
        institution_id=created_institution.id, 
        request=update_request
    )
    
    assert updated_institution.id == created_institution.id
    assert updated_institution.name == "New Name"

def test_update_institution_invalid_id(institution_db, make_institution_request):
    """Test update institution with invalid id"""
    service = InstitutionService(session=institution_db)
    request = make_institution_request(name="New Name")
    
    with pytest.raises(BadRequestException) as excinfo:
        service.update_institution(institution_id="invalid-uuid", request=request)
        
    assert "Invalid UUID format" in str(excinfo.value)

def test_update_institution_not_found(institution_db, make_institution_request):
    """Test update institution not found"""
    service = InstitutionService(session=institution_db)
    random_id = str(uuid4())
    request = make_institution_request(name="New Name")
    
    with pytest.raises(NotFoundException) as excinfo:
        service.update_institution(institution_id=random_id, request=request)
        
    assert f"Institution with id {random_id} not found." in str(excinfo.value)

def test_update_institution_conflict_error(institution_db, make_institution_request):
    """Test update institution conflict error (duplicate name)"""
    service = InstitutionService(session=institution_db)
    
    # Create two institutions
    req1 = make_institution_request(name="Institution A")
    service.create_institution(request=req1)
    
    req2 = make_institution_request(name="Institution B")
    inst2 = service.create_institution(request=req2)
    
    # Try to update inst2's name to "Institution A"
    update_request = make_institution_request(name="Institution A")
    
    with pytest.raises(ConflictException) as excinfo:
        service.update_institution(institution_id=inst2.id, request=update_request)
        
    assert "Institution with this name already exists" in str(excinfo.value)

def test_update_institution_internal_server_error(monkeypatch, institution_db, make_institution_request):
    """Test update institution raises internal server error"""
    service = InstitutionService(session=institution_db)
    
    # Create an institution first
    create_request = make_institution_request(name="Old Name")
    created_institution = service.create_institution(request=create_request)
    
    update_request = make_institution_request(name="New Name")
    
    # Mock commit to raise OperationalError
    def mock_commit(*args, **kwargs):
        raise OperationalError("Fake DB error", None, None)
        
    monkeypatch.setattr(institution_db, "commit", mock_commit)
    
    with pytest.raises(InternalServerException) as excinfo:
        service.update_institution(institution_id=created_institution.id, request=update_request)
        
    assert "Failed to update Institution" in str(excinfo.value)

# delete institution test
def test_delete_institution_success(institution_db, make_institution_request):
    """Test delete institution success"""
    service = InstitutionService(session=institution_db)
    
    # Create an institution first
    create_request = make_institution_request(name="To Be Deleted")
    created_institution = service.create_institution(request=create_request)
    
    # Delete the institution
    result = service.delete_institution(institution_id=created_institution.id)
    assert result is None
    
    # Verify it's gone
    with pytest.raises(NotFoundException):
        service.get_institution(institution_id=created_institution.id)

def test_delete_institution_invalid_id(institution_db):
    """Test delete institution with invalid id"""
    service = InstitutionService(session=institution_db)
    
    with pytest.raises(BadRequestException) as excinfo:
        service.delete_institution(institution_id="invalid-uuid")
        
    assert "Invalid UUID format" in str(excinfo.value)

def test_delete_institution_not_found(institution_db):
    """Test delete institution not found"""
    service = InstitutionService(session=institution_db)
    random_id = str(uuid4())
    
    with pytest.raises(NotFoundException) as excinfo:
        service.delete_institution(institution_id=random_id)
        
    assert f"Institution with id {random_id} not found." in str(excinfo.value)

def test_delete_institution_conflict_error(monkeypatch, institution_db, make_institution_request):
    """Test delete institution conflict error (IntegrityError)"""
    service = InstitutionService(session=institution_db)
    
    # Create an institution first
    create_request = make_institution_request(name="To Be Deleted")
    created_institution = service.create_institution(request=create_request)
    
    # Mock delete to raise IntegrityError (simulating foreign key constraint violation)
    def mock_delete(*args, **kwargs):
        raise IntegrityError("Fake Integrity error", None, None)
        
    monkeypatch.setattr(institution_db, "delete", mock_delete)
    
    with pytest.raises(ConflictException) as excinfo:
        service.delete_institution(institution_id=created_institution.id)
        
    assert "Cannot delete Institution because it is used in existing records." in str(excinfo.value)

def test_delete_institution_internal_server_error(monkeypatch, institution_db, make_institution_request):
    """Test delete institution raises internal server error"""
    service = InstitutionService(session=institution_db)
    
    # Create an institution first
    create_request = make_institution_request(name="To Be Deleted")
    created_institution = service.create_institution(request=create_request)
    
    # Mock commit to raise OperationalError
    def mock_commit(*args, **kwargs):
        raise OperationalError("Fake DB error", None, None)
        
    monkeypatch.setattr(institution_db, "commit", mock_commit)
    
    with pytest.raises(InternalServerException) as excinfo:
        service.delete_institution(institution_id=created_institution.id)
        
    assert "Failed to delete Institution" in str(excinfo.value)
