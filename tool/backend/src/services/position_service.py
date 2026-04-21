import logging
from src.models import PaginationModel
from src.models.response_models import PositionListResponse, PositionResponse
from src.models.table_schemas import Position
from src.core.exceptions import InternalServerException
from sqlmodel import Session, select, func

logger = logging.getLogger(__name__)

class PositionService:
    """
    This service is responsible for executing all position operations.
    """

    def __init__(self, session: Session):
        self.session = session

    # API
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
            logger.error(f"Error fetching positions: {e}")
            raise InternalServerException("Failed to fetch positions from database.") from e