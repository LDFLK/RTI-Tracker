from src.models import RTITemplate, PaginationModel
from src.models.response_models import RTITemplateListResponse, RTITemplateResponse
from sqlmodel import select, func, Session
from src.core.exceptions import InternalServerException
import logging

logger = logging.getLogger(__name__)

class RTITemplateService:
    """
    This service is responsible for executing all RTI template operations.
    """

    def __init__(self, session: Session):
        self.session = session

    async def get_rti_templates(
        self,
        *,
        page: int = 1,
        page_size: int = 10
    ) -> RTITemplateListResponse:
        try:
            offset = (page - 1) * page_size

            # fetch the records from the table
            statement_records = select(RTITemplate).offset(offset).limit(page_size)
            results = self.session.exec(statement_records).all()
            
            # fetch the total record count
            statement_count = select(func.count()).select_from(RTITemplate)
            total_items = self.session.exec(statement_count).one()

            # pagination response
            pagination = PaginationModel(
                page=page,
                pageSize=page_size,
                totalItem=total_items,
                totalPages=(total_items + page_size - 1) // page_size if total_items > 0 else 0
            )
            
            # return the final response
            return RTITemplateListResponse(
                data=[RTITemplateResponse.model_validate(r) for r in results],
                pagination=pagination
            )
        except Exception as e:
            logger.error(f"Error fetching RTI templates: {e}")
            raise InternalServerException("Failed to fetch RTI templates from database.")