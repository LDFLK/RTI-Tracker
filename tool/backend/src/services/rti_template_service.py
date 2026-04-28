from typing import Dict
from uuid import UUID, uuid4
from src.services.github_file_service import GithubFileService
from src.models import RTITemplate, PaginationModel
from src.models.response_models import RTITemplateListResponse, RTITemplateResponse
from src.models.request_models import RTITemplateRequest
from sqlalchemy.exc import IntegrityError
from sqlmodel import select, func, Session
from src.core.exceptions import InternalServerException, BadRequestException, NotFoundException, ConflictException
import logging
import os

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
    def get_rti_template_by_id(
        self,
        *,
        template_id
    ) -> RTITemplateResponse:
        try:
            try:
                target_id = UUID(template_id) if isinstance(template_id, str) else template_id
            except ValueError:
                raise BadRequestException(f"Invalid UUID format: {template_id}")

            rti_template = self.session.get(RTITemplate, target_id)

            if not rti_template:
                raise NotFoundException(f"RTI Template with id {template_id} not found.")

            return RTITemplateResponse.model_validate(rti_template)

        except (BadRequestException, NotFoundException):
            raise
        except Exception as e:
            logger.error(f"[RTI SERVICE] Error reading RTI template: {e}")
            raise InternalServerException(f"Failed to read RTI template: {e}") from e

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
            if template_request.file.content_type != "text/markdown":
                raise BadRequestException(f'{template_request.file.content_type} is not allowed')
            
            content = await template_request.file.read()
            _, ext = os.path.splitext(template_request.file.filename)

            if not ext:
                raise BadRequestException(f"{template_request.file.filename} doesn't have any file extension")
                
            file_path = f"rti-templates/{unique_id}{ext}"

            response = await self.file_service.create_file(
                file_path=file_path, 
                content=content,
                message=f"Upload file {template_request.file.filename}"
            )

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
            if isinstance(e, IntegrityError):
                logger.error(f"[RTI SERVICE] Duplicate title error creating RTI template: {e}")
                raise ConflictException("RTI Template with this title already exists.") from e

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

        old_file_data: Dict | None = None
        try:
            # update the file if provided
            if template_request.file:
                if template_request.file.content_type != "text/markdown":
                    raise BadRequestException(f'{template_request.file.content_type} is not allowed')
                
                content = await template_request.file.read()
                
                # Use the existing path from the DB to ensure we update the correct file
                file_path = rti_template.file

                # fetch old content for compensating transaction
                old_file_data = await self.file_service.read_file(file_path)

                response = await self.file_service.update_file(
                    file_path=file_path, 
                    content=content, 
                    sha=old_file_data["sha"],
                    message=f"Update content of {template_request.file.filename}"
                )
                
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

        except (InternalServerException, BadRequestException, NotFoundException, ConflictException):
            raise
        except Exception as e:
            self.session.rollback()

            # rollback the file update if it was successful but DB commit failed
            if old_file_data:
                current_file_data = await self.file_service.read_file(file_path)
                try:
                    await self.file_service.update_file(
                        file_path=file_path,
                        content=old_file_data["content"],
                        sha=current_file_data["sha"],
                        message=f"Rollback: restore previous version of {file_path}"
                    )
                    logger.info(f"[RTI SERVICE] Compensating transaction: restored {file_path} on github")
                except Exception as ex:
                    logger.error(f"[RTI SERVICE] Compensating transaction failed — could not restore {file_path}: {ex}")

            if isinstance(e, IntegrityError):
                logger.error(f"[RTI SERVICE] Duplicate title error updating RTI template: {e}")
                raise ConflictException("RTI Template with this title already exists.") from e

            logger.error(f"[RTI SERVICE] Error updating RTI template: {e}")
            raise InternalServerException(f"[RTI SERVICE] Failed to update RTI template: {e}") from e

     # API
    async def delete_rti_template(
        self,
        *,
        template_id,
    ) -> Dict:

        try:
            target_id = UUID(template_id) if isinstance(template_id, str) else template_id
        except ValueError:
            raise BadRequestException(f"Invalid UUID format: {template_id}")

        rti_template = self.session.get(RTITemplate, target_id)

        if not rti_template:
            raise NotFoundException(f"RTI Template with id {template_id} not found.")

        file_path = rti_template.file
        old_file_data = None
       
        try:
            if file_path:
                old_file_data = await self.file_service.read_file(file_path)

            # Delete file from GitHub
            if file_path:
                await self.file_service.delete_file(file_path=file_path)

            # Delete record from DB
            self.session.delete(rti_template)
            self.session.commit()
            return None

        except IntegrityError:
            self.session.rollback()
            if old_file_data:
                try:
                    await self.file_service.create_file(
                        file_path=file_path,
                        content=old_file_data["content"],
                        message=f"Recreate file {file_path}"
                    )
                    logger.info(f"[RTI SERVICE] Compensating transaction: recreated {file_path} on github")
                except Exception as ex:
                    logger.error(f"[RTI SERVICE] Compensating transaction failed — could not recreate {file_path}: {ex}")
            raise ConflictException("Cannot delete RTI Template because it is used in existing RTI Requests.")

        except (BadRequestException, NotFoundException, ConflictException):
            raise
        except Exception as e:
            self.session.rollback()
            if old_file_data:
                try:
                    await self.file_service.create_file(
                        file_path=file_path,
                        content=old_file_data["content"],
                        message=f"Recreate file {file_path}"
                    )
                    logger.info(f"[RTI SERVICE] Compensating transaction: recreated {file_path} on github")
                except Exception as ex:
                    logger.error(f"[RTI SERVICE] Compensating transaction failed — could not recreate {file_path}: {ex}")
            logger.error(f"[RTI SERVICE] Error deleting RTI template: {e}")
            raise InternalServerException(f"Failed to delete RTI template: {e}") from e


