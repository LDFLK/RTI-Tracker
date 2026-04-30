import pytest
import uuid
from sqlalchemy.exc import OperationalError, IntegrityError
from src.services.position_service import PositionService
from src.models.response_models import PositionListResponse, PositionResponse
from src.core.exceptions import InternalServerException, NotFoundException, ConflictException
from sqlmodel import SQLModel, Session, create_engine
from src.models.table_schemas import Position
from sqlmodel import select

# helpers

def _first_position_id(session) -> uuid.UUID:
    """Return the id of any seeded position."""
    return session.exec(select(Position)).first().id


# get_positions

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
    assert len(response.data) == 1


def test_get_positions_empty_db():
    """Test behaviour when no positions exist in the database."""
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        service = PositionService(session=session)
        response = service.get_positions()

        assert response.pagination.totalItem == 0
        assert response.pagination.totalPages == 0
        assert response.data == []


def test_get_positions_db_error(monkeypatch, position_db):
    """Test that InternalServerException is raised on a database error."""
    service = PositionService(session=position_db)

    def mock_exec(*args, **kwargs):
        raise OperationalError("Fake DB error", None, None)

    monkeypatch.setattr(position_db, "exec", mock_exec)

    with pytest.raises(InternalServerException) as exc:
        service.get_positions()

    assert "[POSITION SERVICE] Failed to fetch positions" in str(exc.value)


# get_position_by_id

def test_get_position_by_id_success(position_db):
    """Return the correct PositionResponse for a valid id."""
    position = position_db.get(Position, _first_position_id(position_db))
    service = PositionService(session=position_db)

    result = service.get_position_by_id(position_id=position.id)

    assert isinstance(result, PositionResponse)
    assert result.id == position.id
    assert result.name == position.name
    assert result.created_at == position.created_at
    assert result.updated_at == position.updated_at


def test_get_position_by_id_not_found(position_db):
    """Raise NotFoundException for an id that does not exist."""
    service = PositionService(session=position_db)

    with pytest.raises(NotFoundException):
        service.get_position_by_id(position_id=uuid.uuid4())


def test_get_position_by_id_db_error(monkeypatch, position_db):
    """Raise InternalServerException when the DB call itself fails."""
    service = PositionService(session=position_db)

    monkeypatch.setattr(position_db, "get", lambda *a, **kw: (_ for _ in ()).throw(
        OperationalError("boom", None, None)
    ))

    with pytest.raises(InternalServerException) as exc:
        service.get_position_by_id(position_id=uuid.uuid4())

    assert "[POSITION SERVICE] Failed to get position" in str(exc.value)


# create_position

def test_create_position_success(position_db, make_position_request):
    """A new position is persisted and returned as a PositionResponse."""
    service = PositionService(session=position_db)
    request = make_position_request(name="Director")

    result = service.create_position(position_request=request)

    assert isinstance(result, PositionResponse)
    assert result.name == "Director"
    assert result.id is not None


def test_create_position_duplicate_name(position_db, make_position_request):
    """Raise ConflictException when the position name already exists."""
    service = PositionService(session=position_db)
    request = make_position_request(name="Position 1") 

    with pytest.raises(ConflictException) as exc:
        service.create_position(position_request=request)

    assert "already exists" in str(exc.value).lower() or "conflict" in str(exc.value).lower()


def test_create_position_db_error(monkeypatch, position_db, make_position_request):
    """Raise InternalServerException on an unexpected DB error during create."""
    service = PositionService(session=position_db)

    monkeypatch.setattr(position_db, "add", lambda *a, **kw: (_ for _ in ()).throw(
        OperationalError("boom", None, None)
    ))

    with pytest.raises(InternalServerException) as exc:
        service.create_position(position_request=make_position_request())

    assert "[POSITION SERVICE] Failed to create position" in str(exc.value)


# delete_position

def test_delete_position_success(position_db):
    """A position is removed from the DB and None is returned."""
    position_id = _first_position_id(position_db)
    service = PositionService(session=position_db)

    result = service.delete_position(position_id=position_id)

    assert result is None
    # confirm it no longer exists
    with pytest.raises(NotFoundException):
        service.get_position_by_id(position_id=position_id)


def test_delete_position_not_found(position_db):
    """Raise NotFoundException when the target id is absent."""
    service = PositionService(session=position_db)

    with pytest.raises(NotFoundException):
        service.delete_position(position_id=uuid.uuid4())


def test_delete_position_db_error(monkeypatch, position_db):
    """Raise InternalServerException on an unexpected DB error during delete."""
    position_id = _first_position_id(position_db)
    service = PositionService(session=position_db)

    monkeypatch.setattr(position_db, "delete", lambda *a, **kw: (_ for _ in ()).throw(
        OperationalError("boom", None, None)
    ))

    with pytest.raises(InternalServerException) as exc:
        service.delete_position(position_id=position_id)

    assert "[POSITION SERVICE] Failed to delete position" in str(exc.value)


def test_delete_position_conflict_when_in_use(monkeypatch, position_db):
    """Raise ConflictException when position is referenced by another record."""

    position = position_db.exec(select(Position)).first()

    # simulate a FK constraint violation on commit
    def mock_commit(*args, **kwargs):
        raise IntegrityError("FK constraint", None, None)

    monkeypatch.setattr(position_db, "commit", mock_commit)

    service = PositionService(session=position_db)

    with pytest.raises(ConflictException) as exc:
        service.delete_position(position_id=position.id)

    assert "Cannot delete position" in str(exc.value)


# update_position_put

def test_update_position_put_success(position_db, make_position_request):
    """An existing position name is updated and the new value is returned."""
    position_id = _first_position_id(position_db)
    service = PositionService(session=position_db)
    request = make_position_request(name="Updated Position")

    result = service.update_position_put(position_id=position_id, position_request=request)

    assert isinstance(result, PositionResponse)
    assert result.name == "Updated Position"
    assert result.id == position_id


def test_update_position_put_not_found(position_db, make_position_request):
    """Raise NotFoundException when the target id does not exist."""
    service = PositionService(session=position_db)

    with pytest.raises(NotFoundException):
        service.update_position_put(
            position_id=uuid.uuid4(),
            position_request=make_position_request(name="Ghost"),
        )


def test_update_position_put_duplicate_name(position_db, make_position_request):
    """Raise ConflictException when the new name clashes with an existing one."""

    positions = position_db.exec(select(Position)).all()
    target_id = positions[0].id
    existing_name = positions[1].name  

    service = PositionService(session=position_db)

    with pytest.raises(ConflictException):
        service.update_position_put(
            position_id=target_id,
            position_request=make_position_request(name=existing_name),
        )


def test_update_position_put_db_error(monkeypatch, position_db, make_position_request):
    """Raise InternalServerException on an unexpected DB error during update."""
    position_id = _first_position_id(position_db)
    service = PositionService(session=position_db)

    monkeypatch.setattr(position_db, "add", lambda *a, **kw: (_ for _ in ()).throw(
        OperationalError("boom", None, None)
    ))

    with pytest.raises(InternalServerException) as exc:
        service.update_position_put(
            position_id=position_id,
            position_request=make_position_request(name="Boom"),
        )

    assert "[POSITION SERVICE] Failed to update position" in str(exc.value)