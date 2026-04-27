import logging
from src.models import PaginationModel
from src.models.response_models import PositionListResponse, PositionResponse
from src.models.request_models import PositionRequest
from src.models.table_schemas import Position
from src.core.exceptions import InternalServerException, NotFoundException, ConflictException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select, func
from uuid import UUID, uuid4

logger = logging.getLogger(__name__)

class PositionService:
    """
    This service is responsible for executing all position operations.
    """

    def __init__(self, session: Session):
        self.session = session

    # API
    # get list of all positions
    def get_positions(
        self,
        *,
        page: int = 1,
        page_size: int = 10
    ) -> PositionListResponse:
        try:
            offset = (page - 1) * page_size

            # fetch the records from the table
            statement_records = select(Position).order_by(Position.created_at.desc()).offset(offset).limit(page_size)
            results = self.session.exec(statement_records).all()
            
            # fetch the total record count
            statement_count = select(func.count()).select_from(Position)
            total_items = self.session.exec(statement_count).one()

            # pagination response
            pagination = PaginationModel(
                page=page,
                pageSize=page_size,
                totalItem=total_items,
                totalPages=(total_items + page_size - 1) // page_size if total_items > 0 else 0
            )
            
            # return the final response
            return PositionListResponse(
                data=[PositionResponse.model_validate(r) for r in results],
                pagination=pagination
            )
        except Exception as e:
            logger.error(f"[POSITION SERVICE] Error fetching positions: {e}")
            raise InternalServerException(
                "[POSITION SERVICE] Failed to fetch positions"
            ) from e
    
    # get position by id
    def get_position_by_id(self, *, position_id: UUID) -> PositionResponse:
        try:
            # fetch the record from the table
            result = self.session.get(Position, position_id)

            if result is None:
                raise NotFoundException("Position not found")

            return PositionResponse.model_validate(result)
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"[POSITION SERVICE] Error getting position: {e}")
            raise InternalServerException(
                "[POSITION SERVICE] Failed to get position"
            ) from e

    # delete position
    def delete_position(self, *, position_id: UUID) -> None:
        try:
            # fetch the record from the table
            result = self.session.get(Position, position_id)

            if result is None:
                raise NotFoundException("Position not found")

            # delete the record
            self.session.delete(result)
            self.session.commit()

            return None
        except IntegrityError as e:
            self.session.rollback()
            # detect foreign key constraint violation
            raise ConflictException(
                "Cannot delete position"
            ) from e
        except NotFoundException:
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[POSITION SERVICE] Error deleting position: {e}")
            raise InternalServerException(
                "[POSITION SERVICE] Failed to delete position"
            ) from e  

    # create position
    def create_position(self, *, position_request: PositionRequest) -> PositionResponse:
        try:
            # generate a uuid
            unique_id = uuid4()

            # create position
            position = Position(
                id=unique_id,
                name=position_request.name
            )

            self.session.add(position)
            self.session.commit()
            self.session.refresh(position)

            return PositionResponse.model_validate(position)
        except IntegrityError as e:
            self.session.rollback()
            # detect unique constraint
            constraint = e.orig.diag.constraint_name

            if constraint == "positions_name_key":
                raise ConflictException("Position name already exists")

            else:
                raise ConflictException("Duplicate values violates unique constraint")
        except Exception as e:
            self.session.rollback()
            logger.error(f"[POSITION SERVICE] Error creating position: {e}")
            raise InternalServerException(
                "[POSITION SERVICE] Failed to create position"
            ) from e

    # update position [PATCH]
    def update_position_patch(self, *, position_id: UUID, position_request: PositionRequest) -> PositionResponse:
        try:
            # fetch the record from the table
            result = self.session.get(Position, position_id)

            if result is None:
                raise NotFoundException("Position not found")

            # update(PATCH) the record
            # get only provided fields (including explicit nulls)
            update_data = position_request.model_dump(exclude_unset=True)

            # apply updates dynamically
            for field, value in update_data.items():
                setattr(result, field, value)

            self.session.add(result)
            self.session.commit()
            self.session.refresh(result)

            return PositionResponse.model_validate(result)
        except IntegrityError as e:
            self.session.rollback()
            # detect unique constraint
            constraint = e.orig.diag.constraint_name

            if constraint == "positions_name_key":
                raise ConflictException("Position name already exists")

            else:
                raise ConflictException("Duplicate values violates unique constraint")
        except NotFoundException:
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[POSITION SERVICE] Error updating position: {e}")
            raise InternalServerException(
                "[POSITION SERVICE] Failed to update position"
            ) from e
    
    # update position [PUT]
    def update_position_put(self, *, position_id: UUID, position_request: PositionRequest) -> PositionResponse:
        try:
            # fetch the record from the table
            result = self.session.get(Position, position_id)

            if result is None:
                raise NotFoundException("Position not found")

            # update(PUT) the record
            result.name = position_request.name

            self.session.add(result)
            self.session.commit()
            self.session.refresh(result)

            return PositionResponse.model_validate(result)
        except IntegrityError as e:
            self.session.rollback()
            # detect unique constraint
            constraint = e.orig.diag.constraint_name

            if constraint == "positions_name_key":
                raise ConflictException("Position name already exists")

            else:
                raise ConflictException("Duplicate values violates unique constraint")
        except NotFoundException:
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[POSITION SERVICE] Error updating position: {e}")
            raise InternalServerException(
                "[POSITION SERVICE] Failed to update position"
            ) from e
