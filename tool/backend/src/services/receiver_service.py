import logging
from src.models import Receiver, PaginationModel, ReceiverRequest, ReceiverUpdateRequest
from src.models.response_models import ReceiverListResponse, ReceiverResponse
from src.core import InternalServerException, ConflictException, NotFoundException
from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from uuid import uuid4, UUID

logger = logging.getLogger(__name__)

class ReceiverService:
    """
    This service is responsible for executing all receiver operations.
    """

    def __init__(self, session: Session):
        self.session = session

    # API
    def create_receiver(self, *, receiver_request: ReceiverRequest) -> ReceiverResponse:
        try:
            receiver = Receiver(
                id=uuid4(),
                position_id=receiver_request.position_id,
                institution_id=receiver_request.institution_id,
                email=receiver_request.email,
                address=receiver_request.address,
                contact_no=receiver_request.contact_no
            )
            self.session.add(receiver)
            self.session.commit()
            
            return self.get_receiver_by_id(receiver_id=receiver.id)

        except IntegrityError as e:
            self.session.rollback()
            error_msg = str(e.orig)
            if "receivers_email_key" in error_msg or "receivers.email" in error_msg:
                raise ConflictException("Email already exists for another receiver.")
            if "receivers_contact_no_key" in error_msg or "receivers.contact_no" in error_msg:
                raise ConflictException("Contact number already exists for another receiver.")
            
            # Clean up the DB error message to return it directly
            clean_error = error_msg.replace('\n', ' ').strip()
            raise ConflictException(f"Database constraint violation: {clean_error}")
        except Exception as e:
            self.session.rollback()
            logger.error(f"[RECEIVER SERVICE] Error creating Receiver: {e}")
            raise InternalServerException("Failed to create Receiver in database.") from e

    # API
    def get_receivers(
        self,
        *,
        page: int = 1,
        page_size: int = 10
    ) -> ReceiverListResponse:
        try:
            offset = (page - 1) * page_size

            # fetch the records from the table
            statement_records = (
                select(Receiver)
                .options(selectinload(Receiver.position), selectinload(Receiver.institution))
                .order_by(Receiver.created_at.desc())
                .offset(offset)
                .limit(page_size)
            )
            results = self.session.exec(statement_records).all()
            
            # fetch the total record count
            statement_count = select(func.count()).select_from(Receiver)
            total_items = self.session.exec(statement_count).one()

            # pagination response
            pagination = PaginationModel(
                page=page,
                pageSize=page_size,
                totalItem=total_items,
                totalPages=(total_items + page_size - 1) // page_size if total_items > 0 else 0
            )
            
            # return the final response
            return ReceiverListResponse(
                data=[ReceiverResponse.model_validate(r) for r in results],
                pagination=pagination
            )
        except Exception as e:
            logger.error(f"[RECEIVER SERVICE] Error fetching Receivers: {e}")
            raise InternalServerException("Failed to fetch Receivers from database.") from e

    # API
    def get_receiver_by_id(self, *, receiver_id: UUID) -> ReceiverResponse:
        try:
            statement = select(Receiver).where(Receiver.id == receiver_id).options(
                selectinload(Receiver.position), selectinload(Receiver.institution)
            )
            receiver = self.session.exec(statement).first()
            if not receiver:
                raise NotFoundException(f"Receiver with ID {receiver_id} not found.")
            return ReceiverResponse.model_validate(receiver)
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"[RECEIVER SERVICE] Error fetching Receiver by ID: {e}")
            raise InternalServerException("Failed to fetch Receiver from database.") from e

    # API
    def update_receiver(self, *, receiver_id: UUID, receiver_request: ReceiverUpdateRequest) -> ReceiverResponse:
        try:
            statement = select(Receiver).where(Receiver.id == receiver_id)
            receiver = self.session.exec(statement).first()
            if not receiver:
                raise NotFoundException(f"Receiver with ID {receiver_id} not found.")
            
            # Partial update: only update fields that were actually sent in the request
            update_data = receiver_request.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(receiver, key, value)
            
            self.session.add(receiver)
            self.session.commit()
            
            return self.get_receiver_by_id(receiver_id=receiver.id)

        except NotFoundException:
            raise
        except IntegrityError as e:
            self.session.rollback()
            error_msg = str(e.orig)
            if "receivers_email_key" in error_msg or "receivers.email" in error_msg:
                raise ConflictException("Email already exists for another receiver.")
            if "receivers_contact_no_key" in error_msg or "receivers.contact_no" in error_msg:
                raise ConflictException("Contact number already exists for another receiver.")
            
            # Clean up the DB error message to return it directly
            clean_error = error_msg.replace('\n', ' ').strip()
            raise ConflictException(f"Database constraint violation: {clean_error}")
        except Exception as e:
            self.session.rollback()
            logger.error(f"[RECEIVER SERVICE] Error updating Receiver: {e}")
            raise InternalServerException("Failed to update Receiver in database.") from e

    # API
    def delete_receiver(self, *, receiver_id: UUID) -> None:
        try:
            statement = select(Receiver).where(Receiver.id == receiver_id)
            receiver = self.session.exec(statement).first()
            if not receiver:
                raise NotFoundException(f"Receiver with ID {receiver_id} not found.")
            
            self.session.delete(receiver)
            self.session.commit()
        except IntegrityError as e:
            self.session.rollback()
            # detect foreign key constraint violation
            logger.error(f"[RECEIVER SERVICE] Error deleting receiver: {e}")
            raise ConflictException(
                "Cannot delete receiver because it is used in some other records"
            ) from e
        except NotFoundException:
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[RECEIVER SERVICE] Error deleting receiver: {e}")
            raise InternalServerException("Failed to delete receiver from database.") from e

