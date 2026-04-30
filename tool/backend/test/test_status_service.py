import uuid
from unittest.mock import MagicMock
import pytest
from pydantic import ValidationError
from sqlmodel import select, Session, create_engine, SQLModel
from src.models.response_models import StatusResponse, StatusListResponse
from src.models.request_models import StatusRequest
from src.core.exceptions import InternalServerException
from src.models import Status
from src.services import StatusService
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from src.core.exceptions import ConflictException, NotFoundException

def _make_integrity_error(constraint_name: str):
    """Build an IntegrityError that looks like a UniqueViolation."""
    diag = MagicMock()
    diag.constraint_name = constraint_name

    orig = MagicMock()
    orig.diag = diag
    return IntegrityError(statement=None, params=None, orig=orig)

# StatusRequest validation

def test_status_request_strips_whitespace():
    req = StatusRequest(name="  Pending  ")
    assert req.name == "Pending"


def test_status_request_raises_on_missing_name():
    with pytest.raises(ValidationError) as exc_info:
        StatusRequest()
    errors = exc_info.value.errors()
    assert any("name" in str(e["loc"]) for e in errors)


def test_status_request_raises_on_invalid_name_type():
    with pytest.raises(ValidationError) as exc_info:
        StatusRequest(name=12345)
    errors = exc_info.value.errors()
    assert errors[0]["type"] == "string_type"
    assert "name" in errors[0]["loc"]


def test_status_request_raises_on_empty_name():
    with pytest.raises(ValidationError):
        StatusRequest(name="")


# StatusService.create_status

def test_create_status_returns_status_response(status_db, make_status_request):
    service = StatusService(session=status_db)
    result = service.create_status(status_request=make_status_request())

    assert isinstance(result, StatusResponse)
    assert result.name == "Dispatched"
    assert isinstance(result.id, uuid.UUID)


def test_create_status_persists_to_db(status_db, make_status_request):
    service = StatusService(session=status_db)
    result = service.create_status(status_request=make_status_request(name="Dispatched"))

    db_record = status_db.exec(select(Status).where(Status.id == result.id)).first()
    assert db_record is not None
    assert db_record.name == "Dispatched"


def test_create_status_response_has_timestamps(status_db, make_status_request):
    service = StatusService(session=status_db)
    result = service.create_status(status_request=make_status_request())

    assert isinstance(result.created_at, datetime)
    assert isinstance(result.updated_at, datetime)


def test_create_status_raises_internal_on_db_error(monkeypatch, status_db, make_status_request):
    service = StatusService(session=status_db)
    monkeypatch.setattr(status_db, "commit", MagicMock(side_effect=Exception("DB failure")))

    with pytest.raises(InternalServerException):
        service.create_status(status_request=make_status_request())


def test_create_status_rolls_back_on_db_error(monkeypatch, status_db, make_status_request):
    service = StatusService(session=status_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(status_db, "commit", MagicMock(side_effect=Exception("DB failure")))
    monkeypatch.setattr(status_db, "rollback", rollback_mock)

    with pytest.raises(InternalServerException):
        service.create_status(status_request=make_status_request())
    rollback_mock.assert_called_once()


def test_create_status_raises_conflict_on_duplicate_name(monkeypatch, status_db, make_status_request):
    service = StatusService(session=status_db)
    monkeypatch.setattr(
        status_db, "commit",
        MagicMock(side_effect=_make_integrity_error("rti_statuses_name_key"))
    )

    with pytest.raises(ConflictException) as exc_info:
        service.create_status(status_request=make_status_request())
    assert "already exists" in exc_info.value.message


def test_create_status_rolls_back_on_integrity_error(monkeypatch, status_db, make_status_request):
    service = StatusService(session=status_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(
        status_db, "commit",
        MagicMock(side_effect=_make_integrity_error("rti_statuses_name_key"))
    )
    monkeypatch.setattr(status_db, "rollback", rollback_mock)

    with pytest.raises(ConflictException):
        service.create_status(status_request=make_status_request())
    rollback_mock.assert_called_once()


# StatusService.get_status_list

def test_get_status_list_returns_status_list_response(status_db):
    service = StatusService(session=status_db)
    result = service.get_status_list()

    assert isinstance(result, StatusListResponse)


def test_get_status_list_returns_all_on_first_page(status_db):
    service = StatusService(session=status_db)
    result = service.get_status_list(page=1, page_size=10)

    assert len(result.data) == 3


def test_get_status_list_items_are_status_responses(status_db):
    service = StatusService(session=status_db)
    result = service.get_status_list()

    for item in result.data:
        assert isinstance(item, StatusResponse)


def test_get_status_list_pagination_total_items(status_db):
    service = StatusService(session=status_db)
    result = service.get_status_list(page=1, page_size=10)

    assert result.pagination.totalItem == 3


def test_get_status_list_pagination_total_pages(status_db):
    service = StatusService(session=status_db)
    result = service.get_status_list(page=1, page_size=2)

    assert result.pagination.totalPages == 2


def test_get_status_list_pagination_reflects_page_and_size(status_db):
    service = StatusService(session=status_db)
    result = service.get_status_list(page=2, page_size=2)

    assert result.pagination.page == 2
    assert result.pagination.pageSize == 2


def test_get_status_list_page_size_limits_results(status_db):
    service = StatusService(session=status_db)
    result = service.get_status_list(page=1, page_size=2)

    assert len(result.data) == 2


def test_get_status_list_second_page_returns_remaining(status_db):
    service = StatusService(session=status_db)
    result = service.get_status_list(page=2, page_size=2)

    assert len(result.data) == 1


def test_get_status_list_returns_most_recent_first(status_db):
    """Results are ordered by created_at DESC, so Completed (newest) comes first."""
    service = StatusService(session=status_db)
    result = service.get_status_list(page=1, page_size=10)

    assert result.data[0].name == "Completed"
    assert result.data[-1].name == "Pending"


def test_get_status_list_out_of_range_page_returns_empty(status_db):
    service = StatusService(session=status_db)
    result = service.get_status_list(page=99, page_size=10)

    assert len(result.data) == 0


def test_get_status_list_empty_db_returns_empty_data():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        service = StatusService(session=session)
        result = service.get_status_list()

    assert len(result.data) == 0
    assert result.pagination.totalItem == 0
    assert result.pagination.totalPages == 0


def test_get_status_list_raises_internal_on_db_error(monkeypatch, status_db):
    service = StatusService(session=status_db)
    monkeypatch.setattr(status_db, "exec", MagicMock(side_effect=Exception("DB failure")))

    with pytest.raises(InternalServerException):
        service.get_status_list()


# StatusService.get_status_by_id

def test_get_status_by_id_returns_correct_status(status_db):
    existing = status_db.exec(select(Status)).first()
    service = StatusService(session=status_db)
    result = service.get_status_by_id(status_id=existing.id)

    assert isinstance(result, StatusResponse)
    assert result.id == existing.id
    assert result.name == existing.name


def test_get_status_by_id_returns_correct_name(status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    result = service.get_status_by_id(status_id=pending.id)

    assert result.name == "Pending"


def test_get_status_by_id_raises_not_found_for_unknown_id(status_db):
    service = StatusService(session=status_db)

    with pytest.raises(NotFoundException) as exc_info:
        service.get_status_by_id(status_id=uuid.uuid4())
    assert "not found" in exc_info.value.message.lower()


def test_get_status_by_id_raises_internal_on_db_error(monkeypatch, status_db):
    existing = status_db.exec(select(Status)).first()
    service = StatusService(session=status_db)
    monkeypatch.setattr(status_db, "get", MagicMock(side_effect=Exception("DB failure")))

    with pytest.raises(InternalServerException):
        service.get_status_by_id(status_id=existing.id)


# StatusService.update_status_put

def test_update_status_put_replaces_name(status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    result = service.update_status_put(
        status_id=pending.id,
        status_request=StatusRequest(name="Updated Status"),
    )

    assert result.name == "Updated Status"


def test_update_status_put_persists_to_db(status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    service.update_status_put(
        status_id=pending.id,
        status_request=StatusRequest(name="Persisted Status"),
    )

    refreshed = status_db.exec(select(Status).where(Status.id == pending.id)).first()
    assert refreshed.name == "Persisted Status"


def test_update_status_put_returns_status_response(status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    result = service.update_status_put(
        status_id=pending.id,
        status_request=StatusRequest(name="New Name"),
    )

    assert isinstance(result, StatusResponse)


def test_update_status_put_raises_not_found_for_unknown_id(status_db):
    service = StatusService(session=status_db)

    with pytest.raises(NotFoundException):
        service.update_status_put(
            status_id=uuid.uuid4(),
            status_request=StatusRequest(name="Ghost"),
        )


def test_update_status_put_raises_conflict_on_duplicate_name(monkeypatch, status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    monkeypatch.setattr(
        status_db, "commit",
        MagicMock(side_effect=_make_integrity_error("rti_statuses_name_key"))
    )

    with pytest.raises(ConflictException) as exc_info:
        service.update_status_put(
            status_id=pending.id,
            status_request=StatusRequest(name="Delivery"),
        )
    assert "already exists" in exc_info.value.message


def test_update_status_put_rolls_back_on_integrity_error(monkeypatch, status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(
        status_db, "commit",
        MagicMock(side_effect=_make_integrity_error("rti_statuses_name_key"))
    )
    monkeypatch.setattr(status_db, "rollback", rollback_mock)

    with pytest.raises(ConflictException):
        service.update_status_put(
            status_id=pending.id,
            status_request=StatusRequest(name="Delivery"),
        )
    rollback_mock.assert_called_once()


def test_update_status_put_raises_internal_on_db_error(monkeypatch, status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    monkeypatch.setattr(status_db, "commit", MagicMock(side_effect=Exception("DB failure")))

    with pytest.raises(InternalServerException):
        service.update_status_put(
            status_id=pending.id,
            status_request=StatusRequest(name="New Name"),
        )


def test_update_status_put_rolls_back_on_db_error(monkeypatch, status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(status_db, "commit", MagicMock(side_effect=Exception("DB failure")))
    monkeypatch.setattr(status_db, "rollback", rollback_mock)

    with pytest.raises(InternalServerException):
        service.update_status_put(
            status_id=pending.id,
            status_request=StatusRequest(name="New Name"),
        )
    rollback_mock.assert_called_once()


# StatusService.delete_status

def test_delete_status_returns_none(status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)

    result = service.delete_status(status_id=pending.id)

    assert result is None


def test_delete_status_removes_record_from_db(status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    pending_id = pending.id
    service = StatusService(session=status_db)
    service.delete_status(status_id=pending_id)

    remaining = status_db.exec(select(Status).where(Status.id == pending_id)).first()
    assert remaining is None


def test_delete_status_does_not_affect_other_records(status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    service.delete_status(status_id=pending.id)

    remaining = status_db.exec(select(Status)).all()
    assert len(remaining) == 2
    names = {s.name for s in remaining}
    assert "Pending" not in names


def test_delete_status_raises_not_found_for_unknown_id(status_db):
    service = StatusService(session=status_db)

    with pytest.raises(NotFoundException) as exc_info:
        service.delete_status(status_id=uuid.uuid4())
    assert "not found" in exc_info.value.message.lower()


def test_delete_status_raises_conflict_on_fk_integrity_error(monkeypatch, status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    monkeypatch.setattr(
        status_db, "commit",
        MagicMock(side_effect=_make_integrity_error("rti_status_histories_status_id_fkey"))
    )

    with pytest.raises(ConflictException) as exc_info:
        service.delete_status(status_id=pending.id)
    assert "Cannot delete status" in exc_info.value.message


def test_delete_status_rolls_back_on_integrity_error(monkeypatch, status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(
        status_db, "commit",
        MagicMock(side_effect=_make_integrity_error("rti_status_histories_status_id_fkey"))
    )
    monkeypatch.setattr(status_db, "rollback", rollback_mock)

    with pytest.raises(ConflictException):
        service.delete_status(status_id=pending.id)
    rollback_mock.assert_called_once()


def test_delete_status_raises_internal_on_db_error(monkeypatch, status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    monkeypatch.setattr(status_db, "commit", MagicMock(side_effect=Exception("DB failure")))

    with pytest.raises(InternalServerException):
        service.delete_status(status_id=pending.id)


def test_delete_status_rolls_back_on_db_error(monkeypatch, status_db):
    pending = status_db.exec(select(Status).where(Status.name == "Pending")).first()
    service = StatusService(session=status_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(status_db, "commit", MagicMock(side_effect=Exception("DB failure")))
    monkeypatch.setattr(status_db, "rollback", rollback_mock)

    with pytest.raises(InternalServerException):
        service.delete_status(status_id=pending.id)
    rollback_mock.assert_called_once()
