import uuid
from unittest.mock import MagicMock
import pytest
from pydantic import ValidationError
from sqlmodel import select
from src.models.response_models import SenderResponse
from src.models.request_models import SenderRequest
from src.core.exceptions import InternalServerException, BadRequestException
from src.models import Sender
from src.services import SenderService
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from src.core.exceptions import ConflictException

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