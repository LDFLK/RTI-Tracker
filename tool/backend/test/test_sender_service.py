import uuid
from unittest.mock import MagicMock
import pytest
from pydantic import ValidationError
from sqlmodel import select, Session, create_engine, SQLModel
from src.models.response_models import SenderResponse, SenderListResponse
from src.models.request_models import SenderRequest
from src.core.exceptions import InternalServerException, BadRequestException
from src.models import Sender
from src.services import SenderService
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from src.core.exceptions import ConflictException, NotFoundException

# Unit tests – SenderRequest validation

def test_sender_request_valid_with_email_only():
    req = SenderRequest(name="Alice", email="alice@example.com")
    assert req.email == "alice@example.com"
    assert req.contact_no is None

def test_sender_request_valid_with_contact_no_only():
    req = SenderRequest(name="Bob", contact_no="0771234567")
    assert req.contact_no == "0771234567"
    assert req.email is None

def test_sender_request_valid_with_both_fields():
    req = SenderRequest(name="Carol", email="carol@example.com", contact_no="0771234567")
    assert req.email == "carol@example.com"
    assert req.contact_no == "0771234567"

def test_sender_request_raises_when_neither_email_nor_contact_no():
    with pytest.raises(BadRequestException) as exc_info:
        SenderRequest(name="Ghost")
    assert exc_info.value.message == "Either email or contact_no must be provided."

def test_sender_request_raises_on_invalid_email_format():
    with pytest.raises(ValidationError) as exc_info:
        SenderRequest(name="Bad Email", email="not-an-email")
    errors = exc_info.value.errors()
    assert errors[0]["type"] == "value_error"
    assert "email" in errors[0]["loc"]

def test_sender_request_strips_whitespace_from_name():
    req = SenderRequest(name="  Jane  ", email="jane@example.com")
    assert req.name == "Jane"

def test_sender_request_optional_fields_default_to_none():
    req = SenderRequest(name="Min", email="min@example.com")
    assert req.address is None
    assert req.contact_no is None

def test_send_invalid_contact_no():
    with pytest.raises(ValidationError) as exc_info:
        SenderRequest(name="Bad Contact No", contact_no=123443)
    errors = exc_info.value.errors()
    assert errors[0]["type"] == "string_type"
    assert "contact_no" in errors[0]["loc"]

def test_send_invalid_name():
    with pytest.raises(ValidationError) as exc_info:
        SenderRequest(name=123443, contact_no="0771234567")
    errors = exc_info.value.errors()
    assert errors[0]["type"] == "string_type"
    assert "name" in errors[0]["loc"]

def test_send_invalid_address():
    with pytest.raises(ValidationError) as exc_info:
        SenderRequest(name="Bad Contact No",address=123443 ,contact_no="0771234567")
    errors = exc_info.value.errors()
    assert errors[0]["type"] == "string_type"
    assert "address" in errors[0]["loc"]

def test_send_good_request():
    req = SenderRequest(name="Good Request", email="example@gmail.com", contact_no="0771234567", address="123 Main St, Colombo 01")
    assert req.name == "Good Request"
    assert req.email == "example@gmail.com"
    assert req.contact_no == "0771234567"
    assert req.address == "123 Main St, Colombo 01"

# Unit tests – SenderService.create_sender

def test_create_sender_with_email_returns_response(rti_template_db, make_sender_request):
    service = SenderService(session=rti_template_db)
    result = service.create_sender(sender_request=make_sender_request())

    assert isinstance(result, SenderResponse)
    assert result.name == "John Doe"
    assert result.email == "john@example.com"
    assert isinstance(result.id, uuid.UUID)

def test_create_sender_with_contact_no_returns_response(rti_template_db, make_sender_request):
    service = SenderService(session=rti_template_db)
    result = service.create_sender(
        sender_request=make_sender_request(email=None, contact_no="0771234567")
    )

    assert result.contact_no == "0771234567"
    assert result.email is None

def test_create_sender_with_all_fields(rti_template_db, make_sender_request):
    service = SenderService(session=rti_template_db)
    result = service.create_sender(
        sender_request=make_sender_request(
            email="john@example.com",
            address="123 Main St, Colombo 01",
            contact_no="0771234567",
        )
    )

    assert result.name == "John Doe"
    assert result.address == "123 Main St, Colombo 01"
    assert result.email == "john@example.com"
    assert result.contact_no == "0771234567"

def test_create_sender_persists_to_db(rti_template_db, make_sender_request):
    service = SenderService(session=rti_template_db)
    result = service.create_sender(sender_request=make_sender_request())

    db_record = rti_template_db.exec(select(Sender).where(Sender.id == result.id)).first()
    assert db_record is not None
    assert db_record.name == "John Doe"
    assert db_record.email == "john@example.com"

def test_create_sender_response_has_timestamps(rti_template_db, make_sender_request):
    service = SenderService(session=rti_template_db)
    result = service.create_sender(sender_request=make_sender_request())

    assert isinstance(result.created_at, datetime)
    assert isinstance(result.updated_at, datetime)

def test_create_sender_raises_internal_on_db_error(monkeypatch, rti_template_db, make_sender_request):
    service = SenderService(session=rti_template_db)
    monkeypatch.setattr(rti_template_db, "commit", MagicMock(side_effect=Exception("DB failure")))

    with pytest.raises(InternalServerException):
        service.create_sender(sender_request=make_sender_request())

def test_create_sender_rolls_back_on_db_error(monkeypatch, rti_template_db, make_sender_request):
    service = SenderService(session=rti_template_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(rti_template_db, "commit", MagicMock(side_effect=Exception("DB failure")))
    monkeypatch.setattr(rti_template_db, "rollback", rollback_mock)

    with pytest.raises(InternalServerException):
        service.create_sender(sender_request=make_sender_request())
    rollback_mock.assert_called_once()

# IntegrityError tests – SenderService.create_sender

def _make_integrity_error(constraint_name: str):
    """Build a fake IntegrityError that looks like an UniqueViolation."""
    diag = MagicMock()
    diag.constraint_name = constraint_name

    orig = MagicMock()
    orig.diag = diag
    return IntegrityError(statement=None, params=None, orig=orig)

def test_create_sender_raises_conflict_on_duplicate_email(monkeypatch, rti_template_db, make_sender_request):
    service = SenderService(session=rti_template_db)
    monkeypatch.setattr(rti_template_db, "commit", MagicMock(side_effect=_make_integrity_error("senders_email_key")))

    with pytest.raises(ConflictException) as exc_info:
        service.create_sender(sender_request=make_sender_request())
    assert "Email" in exc_info.value.message

def test_create_sender_raises_conflict_on_duplicate_contact_no(monkeypatch, rti_template_db, make_sender_request):
    service = SenderService(session=rti_template_db)
    monkeypatch.setattr(rti_template_db, "commit", MagicMock(side_effect=_make_integrity_error("senders_contact_no_key")))

    with pytest.raises(ConflictException) as exc_info:
        service.create_sender(sender_request=make_sender_request(email=None, contact_no="0771234567"))
    assert "Contact" in exc_info.value.message

def test_create_sender_rolls_back_on_integrity_error(monkeypatch, rti_template_db, make_sender_request):
    service = SenderService(session=rti_template_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(rti_template_db, "commit", MagicMock(side_effect=_make_integrity_error("senders_email_key")))
    monkeypatch.setattr(rti_template_db, "rollback", rollback_mock)

    with pytest.raises(ConflictException):
        service.create_sender(sender_request=make_sender_request())
    rollback_mock.assert_called_once()

def test_create_sender_integrity_error_default_fallback(monkeypatch, rti_template_db, make_sender_request):
    service = SenderService(session=rti_template_db)

    rollback_mock = MagicMock()
    monkeypatch.setattr(rti_template_db, "commit", MagicMock(side_effect=_make_integrity_error("unknown_constraint")))
    monkeypatch.setattr(rti_template_db, "rollback", rollback_mock)

    with pytest.raises(ConflictException) as exc:
        service.create_sender(sender_request=make_sender_request())

    assert "Duplicate values violates unique constraint" in str(exc.value)
    rollback_mock.assert_called_once()


# get_sender_list

def test_get_sender_list_returns_sender_list_response(sender_db):
    service = SenderService(session=sender_db)
    result = service.get_sender_list()

    assert isinstance(result, SenderListResponse)


def test_get_sender_list_returns_all_senders_on_first_page(sender_db):
    service = SenderService(session=sender_db)
    result = service.get_sender_list(page=1, page_size=10)

    assert len(result.data) == 3


def test_get_sender_list_items_are_sender_responses(sender_db):
    service = SenderService(session=sender_db)
    result = service.get_sender_list()

    for item in result.data:
        assert isinstance(item, SenderResponse)


def test_get_sender_list_pagination_total_items(sender_db):
    service = SenderService(session=sender_db)
    result = service.get_sender_list(page=1, page_size=10)

    assert result.pagination.totalItem == 3


def test_get_sender_list_pagination_total_pages(sender_db):
    service = SenderService(session=sender_db)
    result = service.get_sender_list(page=1, page_size=2)

    assert result.pagination.totalPages == 2


def test_get_sender_list_pagination_reflects_page_and_size(sender_db):
    service = SenderService(session=sender_db)
    result = service.get_sender_list(page=2, page_size=2)

    assert result.pagination.page == 2
    assert result.pagination.pageSize == 2


def test_get_sender_list_page_size_limits_results(sender_db):
    service = SenderService(session=sender_db)
    result = service.get_sender_list(page=1, page_size=2)

    assert len(result.data) == 2


def test_get_sender_list_second_page_returns_remaining(sender_db):
    service = SenderService(session=sender_db)
    result = service.get_sender_list(page=2, page_size=2)

    assert len(result.data) == 1


def test_get_sender_list_returns_most_recent_first(sender_db):
    """Results are ordered by created_at DESC, so Carol (newest) comes first."""
    service = SenderService(session=sender_db)
    result = service.get_sender_list(page=1, page_size=10)

    assert result.data[0].name == "Carol"
    assert result.data[-1].name == "Alice"


def test_get_sender_list_out_of_range_page_returns_empty(sender_db):
    service = SenderService(session=sender_db)
    result = service.get_sender_list(page=99, page_size=10)

    assert len(result.data) == 0


def test_get_sender_list_empty_db_returns_empty_data():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        service = SenderService(session=session)
        result = service.get_sender_list()

    assert len(result.data) == 0
    assert result.pagination.totalItem == 0
    assert result.pagination.totalPages == 0


def test_get_sender_list_raises_internal_on_db_error(monkeypatch, sender_db):
    service = SenderService(session=sender_db)
    monkeypatch.setattr(sender_db, "exec", MagicMock(side_effect=Exception("DB failure")))

    with pytest.raises(InternalServerException):
        service.get_sender_list()


# get_sender_by_id

def test_get_sender_by_id_returns_correct_sender(sender_db):
    # Fetch an ID that actually exists in the DB
    existing = sender_db.exec(select(Sender)).first()
    service = SenderService(session=sender_db)
    result = service.get_sender_by_id(sender_id=existing.id)

    assert isinstance(result, SenderResponse)
    assert result.id == existing.id
    assert result.name == existing.name


def test_get_sender_by_id_returns_correct_email(sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    result = service.get_sender_by_id(sender_id=alice.id)

    assert result.email == "alice@example.com"


def test_get_sender_by_id_returns_correct_contact_no(sender_db):
    bob = sender_db.exec(select(Sender).where(Sender.name == "Bob")).first()
    service = SenderService(session=sender_db)
    result = service.get_sender_by_id(sender_id=bob.id)

    assert result.contact_no == "0771111111"


def test_get_sender_by_id_raises_not_found_for_unknown_id(sender_db):
    service = SenderService(session=sender_db)

    with pytest.raises(NotFoundException) as exc_info:
        service.get_sender_by_id(sender_id=uuid.uuid4())

    assert "not found" in exc_info.value.message.lower()


def test_get_sender_by_id_raises_internal_on_db_error(monkeypatch, sender_db):
    existing = sender_db.exec(select(Sender)).first()
    service = SenderService(session=sender_db)
    monkeypatch.setattr(sender_db, "get", MagicMock(side_effect=Exception("DB failure")))

    with pytest.raises(InternalServerException):
        service.get_sender_by_id(sender_id=existing.id)

# update_sender_put

def test_update_sender_put_replaces_all_fields(sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    result = service.update_sender_put(
        sender_id=alice.id,
        sender_request=SenderRequest(
            name="Alicia Updated",
            email="alicia_updated@example.com",
            address="New Address",
            contact_no="0773333333",
        ),
    )

    assert result.name == "Alicia Updated"
    assert result.email == "alicia_updated@example.com"
    assert result.address == "New Address"
    assert result.contact_no == "0773333333"


def test_update_sender_put_clears_optional_fields_when_none(sender_db):
    """PUT with email=None and contact_no set should clear the email field."""
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    result = service.update_sender_put(
        sender_id=alice.id,
        sender_request=SenderRequest(
            name="Alicia",
            email=None,
            address=None,
            contact_no="0774444444",
        ),
    )

    assert result.email is None
    assert result.address is None
    assert result.contact_no == "0774444444"


def test_update_sender_put_persists_to_db(sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    service.update_sender_put(
        sender_id=alice.id,
        sender_request=SenderRequest(name="Alicia PUT", email="alicia_put@example.com"),
    )

    refreshed = sender_db.exec(select(Sender).where(Sender.id == alice.id)).first()
    assert refreshed.name == "Alicia PUT"
    assert refreshed.email == "alicia_put@example.com"


def test_update_sender_put_returns_sender_response(sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    result = service.update_sender_put(
        sender_id=alice.id,
        sender_request=SenderRequest(name="Alicia", email="alicia@example.com"),
    )

    assert isinstance(result, SenderResponse)


def test_update_sender_put_raises_not_found_for_unknown_id(sender_db):
    service = SenderService(session=sender_db)

    with pytest.raises(NotFoundException):
        service.update_sender_put(
            sender_id=uuid.uuid4(),
            sender_request=SenderRequest(name="Ghost", email="ghost@example.com"),
        )


def test_update_sender_put_raises_conflict_on_duplicate_email(monkeypatch, sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    monkeypatch.setattr(
        sender_db, "commit",
        MagicMock(side_effect=_make_integrity_error("senders_email_key"))
    )

    with pytest.raises(ConflictException) as exc_info:
        service.update_sender_put(
            sender_id=alice.id,
            sender_request=SenderRequest(name="Alice", email="carol@example.com"),
        )
    assert "Email" in exc_info.value.message


def test_update_sender_put_raises_conflict_on_duplicate_contact_no(monkeypatch, sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    monkeypatch.setattr(
        sender_db, "commit",
        MagicMock(side_effect=_make_integrity_error("senders_contact_no_key"))
    )

    with pytest.raises(ConflictException) as exc_info:
        service.update_sender_put(
            sender_id=alice.id,
            sender_request=SenderRequest(name="Alice", contact_no="0772222222"),
        )
    assert "Contact" in exc_info.value.message


def test_update_sender_put_raises_conflict_on_unknown_constraint(monkeypatch, sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    monkeypatch.setattr(
        sender_db, "commit",
        MagicMock(side_effect=_make_integrity_error("unknown_constraint"))
    )

    with pytest.raises(ConflictException) as exc_info:
        service.update_sender_put(
            sender_id=alice.id,
            sender_request=SenderRequest(name="Alice", email="new@example.com"),
        )
    assert "Duplicate values violates unique constraint" in str(exc_info.value)


def test_update_sender_put_rolls_back_on_integrity_error(monkeypatch, sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(
        sender_db, "commit",
        MagicMock(side_effect=_make_integrity_error("senders_email_key"))
    )
    monkeypatch.setattr(sender_db, "rollback", rollback_mock)

    with pytest.raises(ConflictException):
        service.update_sender_put(
            sender_id=alice.id,
            sender_request=SenderRequest(name="Alice", email="carol@example.com"),
        )
    rollback_mock.assert_called_once()


def test_update_sender_put_raises_internal_on_db_error(monkeypatch, sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    monkeypatch.setattr(sender_db, "commit", MagicMock(side_effect=Exception("DB failure")))

    with pytest.raises(InternalServerException):
        service.update_sender_put(
            sender_id=alice.id,
            sender_request=SenderRequest(name="Alice", email="alice@example.com"),
        )


def test_update_sender_put_rolls_back_on_db_error(monkeypatch, sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(sender_db, "commit", MagicMock(side_effect=Exception("DB failure")))
    monkeypatch.setattr(sender_db, "rollback", rollback_mock)

    with pytest.raises(InternalServerException):
        service.update_sender_put(
            sender_id=alice.id,
            sender_request=SenderRequest(name="Alice", email="alice@example.com"),
        )
    rollback_mock.assert_called_once()


# delete_sender

def test_delete_sender_returns_none(sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)

    result = service.delete_sender(sender_id=alice.id)

    assert result is None


def test_delete_sender_removes_record_from_db(sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    alice_id = alice.id
    service = SenderService(session=sender_db)
    service.delete_sender(sender_id=alice_id)

    remaining = sender_db.exec(select(Sender).where(Sender.id == alice_id)).first()
    assert remaining is None


def test_delete_sender_does_not_affect_other_records(sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    service.delete_sender(sender_id=alice.id)

    remaining = sender_db.exec(select(Sender)).all()
    assert len(remaining) == 2
    names = {s.name for s in remaining}
    assert "Alice" not in names


def test_delete_sender_raises_not_found_for_unknown_id(sender_db):
    service = SenderService(session=sender_db)

    with pytest.raises(NotFoundException) as exc_info:
        service.delete_sender(sender_id=uuid.uuid4())
    assert "not found" in exc_info.value.message.lower()


def test_delete_sender_raises_conflict_on_fk_integrity_error(monkeypatch, sender_db):
    """Deleting a sender that still has associated RTI requests must raise ConflictException."""
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    monkeypatch.setattr(
        sender_db, "commit",
        MagicMock(side_effect=_make_integrity_error("rti_requests_sender_id_fkey"))
    )

    with pytest.raises(ConflictException) as exc_info:
        service.delete_sender(sender_id=alice.id)
    assert "Cannot delete sender" in exc_info.value.message


def test_delete_sender_rolls_back_on_integrity_error(monkeypatch, sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(
        sender_db, "commit",
        MagicMock(side_effect=_make_integrity_error("rti_requests_sender_id_fkey"))
    )
    monkeypatch.setattr(sender_db, "rollback", rollback_mock)

    with pytest.raises(ConflictException):
        service.delete_sender(sender_id=alice.id)
    rollback_mock.assert_called_once()


def test_delete_sender_raises_internal_on_db_error(monkeypatch, sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    monkeypatch.setattr(sender_db, "commit", MagicMock(side_effect=Exception("DB failure")))

    with pytest.raises(InternalServerException):
        service.delete_sender(sender_id=alice.id)


def test_delete_sender_rolls_back_on_db_error(monkeypatch, sender_db):
    alice = sender_db.exec(select(Sender).where(Sender.name == "Alice")).first()
    service = SenderService(session=sender_db)
    rollback_mock = MagicMock()
    monkeypatch.setattr(sender_db, "commit", MagicMock(side_effect=Exception("DB failure")))
    monkeypatch.setattr(sender_db, "rollback", rollback_mock)

    with pytest.raises(InternalServerException):
        service.delete_sender(sender_id=alice.id)
    rollback_mock.assert_called_once()