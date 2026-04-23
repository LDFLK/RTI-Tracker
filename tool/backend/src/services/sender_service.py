from sqlmodel import Session
from src.models import SenderRequest, SenderResponse, Sender
from src.core.exceptions import InternalServerException, ConflictException
from uuid import uuid4
import logging
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

class SenderService:
    """
    This service is responsible for executing all sender related operations
    """

    def __init__(self, session: Session):
        self.session = session

    # API
    # create sender
    def create_sender(self, *, sender_request: SenderRequest) -> SenderResponse:
        try:
            # generate a uuid
            unique_id = uuid4()

            # create sender
            sender = Sender(
                id=unique_id,
                name=sender_request.name,
                email=sender_request.email,
                address=sender_request.address,
                contact_no=sender_request.contact_no,
            )

            self.session.add(sender)
            self.session.commit()
            self.session.refresh(sender)

            return SenderResponse.model_validate(sender)

        except IntegrityError as e:
            self.session.rollback()
            # detect unique constraint
            constraint = e.orig.diag.constraint_name

            if constraint == "senders_email_key":
                raise ConflictException("Email already exists")

            elif constraint == "senders_contact_no_key":
                raise ConflictException("Contact number already exists")

            else:
                raise ConflictException("Duplicate values violates unique constraint")
        except Exception as e:
            self.session.rollback()
            logger.error(f"[SENDER SERVICE] Error creating sender: {e}")
            raise InternalServerException(
                "[SENDER SERVICE] Failed to create sender"
            ) from e
