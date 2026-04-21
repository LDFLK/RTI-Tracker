import logging
from src.models import PaginationModel
from src.models.response_models import InstitutionListResponse, InstitutionResponse
from src.models.table_schemas import Institution
from src.core.exceptions import InternalServerException
from sqlmodel import Session, select, func

logger = logging.getLogger(__name__)

class InstitutionService:
    """
    This service is responsible for executing all institution operations.
    """

    def __init__(self, session: Session):
        self.session = session

    # API
    def get_institutions(
        self,
        *,
        page: int = 1,
        page_size: int = 10
    ) -> InstitutionListResponse:
        try:
            offset = (page - 1) * page_size

            # fetch the records from the table
            statement_records = select(Institution).order_by(Institution.created_at.desc()).offset(offset).limit(page_size)
            results = self.session.exec(statement_records).all()
            
            # fetch the total record count
            statement_count = select(func.count()).select_from(Institution)
            total_items = self.session.exec(statement_count).one()

            # pagination response
            pagination = PaginationModel(
                page=page,
                pageSize=page_size,
                totalItem=total_items,
                totalPages=(total_items + page_size - 1) // page_size if total_items > 0 else 0
            )
            
            # return the final response
            return InstitutionListResponse(
                data=[InstitutionResponse.model_validate(r) for r in results],
                pagination=pagination
            )
        except Exception as e:
            logger.error(f"Error fetching Institutions: {e}")
            raise InternalServerException("Failed to fetch Institutions from database.") from e