# tests/test_position_service.py
import pytest
from sqlalchemy.exc import OperationalError
from src.services.position_service import PositionService
from src.models.response_models import PositionListResponse
from src.core.exceptions import InternalServerException
from sqlmodel import SQLModel, Session, create_engine

def test_get_positions_default(position_db):
    """Test fetching positions with default pagination (page 1, size 10)."""
    service = PositionService(session=position_db)
    response = service.get_positions()
    
    assert isinstance(response, PositionListResponse)
    assert response.pagination.page == 1
    assert response.pagination.pageSize == 10
    assert response.pagination.totalItem == 3
    assert response.pagination.totalPages == 1
    assert len(response.data) == 3
    # verify sorting order (descending by created_at)
    # Position 3 (now) should be first, Position 1 (now - 2h) should be last
    assert response.data[0].name == "Position 3"
    assert response.data[1].name == "Position 2"
    assert response.data[2].name == "Position 1"

def test_get_positions_custom_pagination(position_db):
    """Test fetching positions with custom page and page size."""
    service = PositionService(session=position_db)
    response = service.get_positions(page=2, page_size=2)
    
    assert response.pagination.page == 2
    assert response.pagination.pageSize == 2
    assert response.pagination.totalItem == 3
    assert response.pagination.totalPages == 2
    assert len(response.data) == 1  # Only 1 record left for page 2

def test_get_positions_empty_db():
    """Test behavior when no positions exist in the database."""
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        service = PositionService(session=session)
        response = service.get_positions()
        
        assert response.pagination.totalItem == 0
        assert response.pagination.totalPages == 0
        assert response.data == []

def test_get_positions_db_error(monkeypatch, position_db):
    """Test that InternalServerException is raised when a database error occurs."""
    service = PositionService(session=position_db)
    
    # Mock the session to raise an error during execution
    def mock_exec(*args, **kwargs):
        raise OperationalError("Fake DB error", None, None)
    
    monkeypatch.setattr(position_db, "exec", mock_exec)
    
    with pytest.raises(InternalServerException) as excinfo:
        service.get_positions()
    
    assert "Failed to fetch positions from database" in str(excinfo.value)
