# tests/test_institution_service.py
import pytest
from sqlalchemy.exc import OperationalError
from src.services.institution_service import InstitutionService
from src.models.response_models import InstitutionListResponse
from src.core.exceptions import InternalServerException
from sqlmodel import SQLModel, Session, create_engine

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

