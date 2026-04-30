from sqlmodel import Session, select, func
from src.models import SenderRequest, SenderResponse, Sender, SenderListResponse, PaginationModel
from src.core.exceptions import InternalServerException, ConflictException, NotFoundException
from uuid import uuid4
import logging
from uuid import UUID
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
    
    # get sender list
    def get_sender_list(self, *, page: int = 1, page_size: int = 10) -> SenderListResponse:
        try:
            # calculate the offset
            offset = (page - 1) * page_size

            # fetch the records from the table
            statement_records = select(Sender)\
                .order_by(Sender.created_at.desc())\
                .offset(offset)\
                .limit(page_size)
            results = self.session.exec(statement_records).all()
            
            # fetch the total record count
            statement_count = select(func.count()).select_from(Sender)
            total_items = self.session.exec(statement_count).one()

            # pagination response
            pagination = PaginationModel(
                page=page,
                pageSize=page_size,
                totalItem=total_items,
                totalPages=(total_items + page_size - 1) // page_size if total_items > 0 else 0
            )
            
            # return the final response
            return SenderListResponse(
                data=[SenderResponse.model_validate(r) for r in results],
                pagination=pagination
            )
        except Exception as e:
            logger.error(f"[SENDER SERVICE] Error getting senders: {e}")
            raise InternalServerException(
                "[SENDER SERVICE] Failed to get senders"
            ) from e
    
    # get sender by id
    def get_sender_by_id(self, *, sender_id: UUID) -> SenderResponse:
        try:
            # fetch the record from the table
            result = self.session.get(Sender, sender_id)

            if result is None:
                raise NotFoundException(f"Sender with id {sender_id} not found.")

            return SenderResponse.model_validate(result)
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"[SENDER SERVICE] Error getting sender: {e}")
            raise InternalServerException(
                "[SENDER SERVICE] Failed to get sender"
            ) from e
    
    # update sender [PUT]
    def update_sender_put(self, *, sender_id: UUID, sender_request: SenderRequest) -> SenderResponse:
        try:
            # fetch the record from the table
            result = self.session.get(Sender, sender_id)

            if result is None:
                raise NotFoundException(f"Sender with id {sender_id} not found.")

            # update(PUT) the record
            result.name = sender_request.name
            result.email = sender_request.email
            result.address = sender_request.address
            result.contact_no = sender_request.contact_no

            self.session.add(result)
            self.session.commit()
            self.session.refresh(result)

            return SenderResponse.model_validate(result)
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
        except NotFoundException:
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[SENDER SERVICE] Error updating sender: {e}")
            raise InternalServerException(
                "[SENDER SERVICE] Failed to update sender"
            ) from e
    
    # delete sender
    def delete_sender(self, *, sender_id: UUID) -> None:
        try:
            # fetch the record from the table
            result = self.session.get(Sender, sender_id)

            if result is None:
                raise NotFoundException(f"Sender with id {sender_id} not found.")

            # delete the record
            self.session.delete(result)
            self.session.commit()

            return None
        except IntegrityError as e:
            self.session.rollback()
            # detect foreign key constraint violation
            logger.error(f"[SENDER SERVICE] Error deleting sender: {e}")
            raise ConflictException(
                "Cannot delete sender because it is used in some other records"
            ) from e
        except NotFoundException:
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[SENDER SERVICE] Error deleting sender: {e}")
            raise InternalServerException(
                "[SENDER SERVICE] Failed to delete sender"
            ) from e    
        

