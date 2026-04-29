from sqlmodel import Session, select, func
from src.models import StatusResponse, StatusListResponse, StatusRequest, PaginationModel, Status
from src.core.exceptions import InternalServerException, ConflictException, NotFoundException
from uuid import uuid4
import logging
from uuid import UUID
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

class StatusService:
    """
    This service is responsible for executing all status related operations
    """

    def __init__(self, session: Session):
        self.session = session

    # API
    # create status
    def create_status(self, *, status_request: StatusRequest) -> StatusResponse:
        try:
            # generate a uuid
            unique_id = uuid4()

            # create status
            status = Status(
                id=unique_id,
                name=status_request.name,
          )

            self.session.add(status)
            self.session.commit()
            self.session.refresh(status)

            return StatusResponse.model_validate(status)

        except IntegrityError as e:
            self.session.rollback()
            # detect unique constraint
            constraint = e.orig.diag.constraint_name

            if constraint == "rti_statuses_name_key":
                raise ConflictException("Status name already exists")

            else:
                raise ConflictException("Duplicate values violates unique constraint")
        except Exception as e:
            self.session.rollback()
            logger.error(f"[STATUS SERVICE] Error creating status: {e}")
            raise InternalServerException(
                "[STATUS SERVICE] Failed to create status"
            ) from e
    
    # get status list
    def get_status_list(self, *, page: int = 1, page_size: int = 10) -> StatusListResponse:
        try:
            # calculate the offset
            offset = (page - 1) * page_size

            # fetch the records from the table
            statement_records = select(Status)\
                .order_by(Status.created_at.desc())\
                .offset(offset)\
                .limit(page_size)
            results = self.session.exec(statement_records).all()
            
            # fetch the total record count
            statement_count = select(func.count()).select_from(Status)
            total_items = self.session.exec(statement_count).one()

            # pagination response
            pagination = PaginationModel(
                page=page,
                pageSize=page_size,
                totalItem=total_items,
                totalPages=(total_items + page_size - 1) // page_size if total_items > 0 else 0
            )
            
            # return the final response
            return StatusListResponse(
                data=[StatusResponse.model_validate(r) for r in results],
                pagination=pagination
            )
        except Exception as e:
            logger.error(f"[STATUS SERVICE] Error getting statuses: {e}")
            raise InternalServerException(
                "[STATUS SERVICE] Failed to get statuses"
            ) from e
    
    # get status by id
    def get_status_by_id(self, *, status_id: UUID) -> StatusResponse:
        try:
            # fetch the record from the table
            result = self.session.get(Status, status_id)

            if result is None:
                raise NotFoundException(f"Status with id {status_id} not found.")

            return StatusResponse.model_validate(result)
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"[STATUS SERVICE] Error getting status: {e}")
            raise InternalServerException(
                "[STATUS SERVICE] Failed to get status"
            ) from e
    
    # update status [PUT]
    def update_status_put(self, *, status_id: UUID, status_request: StatusRequest) -> StatusResponse:
        try:
            # fetch the record from the table
            result = self.session.get(Status, status_id)

            if result is None:
                raise NotFoundException(f"Status with id {status_id} not found.")

            # update(PUT) the record
            result.name = status_request.name

            self.session.add(result)
            self.session.commit()
            self.session.refresh(result)

            return StatusResponse.model_validate(result)
        except IntegrityError as e:
            self.session.rollback()
            # detect unique constraint
            constraint = e.orig.diag.constraint_name

            if constraint == "rti_statuses_name_key":
                raise ConflictException("Status name already exists")

            else:
                raise ConflictException("Duplicate values violates unique constraint")
        except NotFoundException:
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[STATUS SERVICE] Error updating status: {e}")
            raise InternalServerException(
                "[STATUS SERVICE] Failed to update status"
            ) from e
    
    # delete status
    def delete_status(self, *, status_id: UUID) -> None:
        try:
            # fetch the record from the table
            result = self.session.get(Status, status_id)

            if result is None:
                raise NotFoundException(f"Status with id {status_id} not found.")

            # delete the record
            self.session.delete(result)
            self.session.commit()

            return None
        except IntegrityError as e:
            self.session.rollback()
            # detect foreign key constraint violation
            logger.error(f"[STATUS SERVICE] Error deleting status: {e}")
            raise ConflictException(
                "Cannot delete status because it is used in some other records"
            ) from e
        except NotFoundException:
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[STATUS SERVICE] Error deleting status: {e}")
            raise InternalServerException(
                "[STATUS SERVICE] Failed to delete status"
            ) from e    
        

