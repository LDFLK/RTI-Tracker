from uuid import UUID, uuid4
from src.services.github_file_service import GithubFileService
from src.models import RTITemplate, PaginationModel
from src.models.response_models import RTITemplateListResponse, RTITemplateResponse
from src.models.request_models import RTITemplateRequest
from sqlmodel import select, func, Session
from src.core.exceptions import InternalServerException, BadRequestException, NotFoundException
import logging
import datetime

logger = logging.getLogger(__name__)

class RTITemplateService:
    """
    This service is responsible for executing all RTI template operations.
    """

    def __init__(self, session: Session, file_service: GithubFileService):
        self.session = session
        self.file_service = file_service

    # API
    def get_rti_templates(
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
            raise InternalServerException("Failed to fetch RTI templates from database.") from e

    # API
    async def create_rti_template(
        self,
        *,
        template_request: RTITemplateRequest
    ) -> RTITemplateResponse:
        try:

            # generate a uuid
            unique_id = uuid4()
            uploaded_file_path: str | None = None  # tracks successful upload for compensating transaction

            # 1. upload the file
            response = await self.file_service.upload_file(template_id=unique_id, file=template_request.file)

            relative_path = response.get("relative_path", "")
            absolute_path = response.get("absolute_path", "")

            if relative_path == "" or absolute_path == "":
                raise InternalServerException("[RTI SERVICE] Invalid path response from file service")

            uploaded_file_path = relative_path 

            # template — store the relative path so the DB is self-contained
            rti_template = RTITemplate(
                id=unique_id,
                title=template_request.title,
                description=template_request.description,
                file=relative_path
                )

            self.session.add(rti_template)
            self.session.commit()
            self.session.refresh(rti_template)

            final_response = RTITemplateResponse.model_validate(rti_template)

            return final_response
        except BadRequestException:
            raise
        except Exception as e:
            self.session.rollback()
            # remove the orphaned file from GitHub if the DB commit failed
            if uploaded_file_path:
                await self.file_service.delete_file(file_path=uploaded_file_path)
            logger.error(f"[RTI SERVICE] Error creating RTI template: {e}")
            raise InternalServerException(f"[RTI SERVICE] Failed to create RTI template: {e}") from e

    # API
    async def update_rti_template(
        self,
        *,
        template_request: RTITemplateRequest
    ) -> RTITemplateResponse:
        # fetch the record from the table
        try:
            target_id = UUID(template_request.id) if isinstance(template_request.id, str) else template_request.id
        except ValueError:
            raise BadRequestException(f"Invalid UUID format: {template_request.id}")

        rti_template = self.session.get(RTITemplate, target_id)

        if not rti_template:
            raise NotFoundException(f"RTI Template with id {template_request.id} not found.")

        try:
            # update the file if provided
            if template_request.file:
                response = await self.file_service.update_file(rti_template.id, template_request.file)
                
                relative_path = response.get("relative_path", "")
                if not relative_path:
                    raise InternalServerException("[RTI SERVICE] Invalid path response from file service")

                rti_template.file = relative_path

            if template_request.title:
                rti_template.title = template_request.title
            
            if template_request.description:
                rti_template.description = template_request.description

            # commit the changes to db
            self.session.add(rti_template)
            self.session.commit()
            self.session.refresh(rti_template)

            return RTITemplateResponse.model_validate(rti_template)

        except (InternalServerException, BadRequestException, NotFoundException):
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[RTI SERVICE] Error updating RTI template: {e}")
            raise InternalServerException(f"[RTI SERVICE] Failed to update RTI template: {e}") from e
            

