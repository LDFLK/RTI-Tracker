import os
import re
import logging
from uuid import UUID, uuid4
from typing import Dict
from sqlalchemy.exc import IntegrityError
from sqlmodel import select, Session, func
from src.models import PaginationModel
from src.services.github_file_service import GithubFileService
from src.models.table_schemas.table_schemas import RTIRequest, RTIStatus, RTIStatusHistories, RTIDirection, Receiver
from src.models.response_models.rti_requests import RTIRequestResponse, RTIRequestListResponse
from src.models.request_models.rti_requests import RTIRequestRequest
from src.core.exceptions import InternalServerException, BadRequestException, NotFoundException, ConflictException
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class RTIRequestService:
    """
    This service is responsible for executing all RTI request operations.
    """

    def __init__(self, session: Session, file_service: GithubFileService):
        self.session = session
        self.file_service = file_service

    async def create_rti_request(
        self,
        *,
        request_data: RTIRequestRequest
    ) -> RTIRequestResponse:
        try:
            unique_id = uuid4()
            uploaded_file_path: str | None = None

            # 1. validate file extension
            if not request_data.file:
                raise BadRequestException("RTI Request file is required")

            _, ext = os.path.splitext(request_data.file.filename)
            if not ext or ext.lower() not in [".pdf"]:
                raise BadRequestException(f"{request_data.file.filename} doesn't have a valid extension (.pdf)")
    
            file_path = f"rti-requests/{unique_id}/{unique_id}{ext.lower()}"

            # 2. Upload file
            content = await request_data.file.read()
            response = await self.file_service.create_file(
                file_path=file_path,
                content=content,
                message=f"Upload file for RTI Request {unique_id}"
            )

            relative_path = response.get("relative_path", "")
            if not relative_path:
                raise InternalServerException("[RTI SERVICE] Invalid path response from file service")

            uploaded_file_path = relative_path

            # 3. Insert RTIRequest
            rti_request = RTIRequest(
                id=unique_id,
                title=request_data.title,
                description=request_data.description,
                sender_id=request_data.sender_id,
                receiver_id=request_data.receiver_id,
                rti_template_id=request_data.rti_template_id
            )
            self.session.add(rti_request)

            # 4. Insert RTIStatusHistories
            statement = select(RTIStatus).where(RTIStatus.name == "CREATED")
            created_status = self.session.exec(statement).first()

            if not created_status:
                raise InternalServerException("Status 'CREATED' not found in database.")

            status_history = RTIStatusHistories(
                id=uuid4(),
                rti_request_id=unique_id,
                status_id=created_status.id,
                direction=RTIDirection.sent,
                description="RTI Request Created",
                entry_time=datetime.now(timezone.utc),
                files=[relative_path]
            )
            self.session.add(status_history)

            self.session.commit()
            self.session.refresh(rti_request)

            return RTIRequestResponse.model_validate(rti_request)

        except (BadRequestException, NotFoundException, ConflictException, InternalServerException):
            raise
        except Exception as e:
            self.session.rollback()
            # remove the orphaned file from GitHub if the DB commit failed
            if uploaded_file_path:
                try:
                    await self.file_service.delete_file(file_path=uploaded_file_path)
                except Exception as ex:
                    logger.error(f"[RTI SERVICE] Compensating transaction failed — could not delete {uploaded_file_path}: {ex}")

            if isinstance(e, IntegrityError):
                logger.error(f"[RTI SERVICE] Integrity error creating RTI request: {e}")
                raise ConflictException("Database integrity error occurred while creating the RTI Request.") from e

            logger.error(f"[RTI SERVICE] Error creating RTI request: {e}")
            raise InternalServerException(f"Failed to create RTI request: {e}") from e

    # API
    def get_rti_requests(
        self,
        *,
        page: int = 1,
        page_size: int = 10
    ) -> RTIRequestListResponse:
        """Fetches a paginated list of RTI Requests."""
        try:
            offset = (page - 1) * page_size

            # fetch the records from the table
            statement_records = select(RTIRequest).offset(offset).limit(page_size)
            results = self.session.exec(statement_records).all()
            
            # fetch the total record count
            statement_count = select(func.count()).select_from(RTIRequest)
            total_items = self.session.exec(statement_count).one()

            # pagination response
            pagination = PaginationModel(
                page=page,
                pageSize=page_size,
                totalItem=total_items,
                totalPages=(total_items + page_size - 1) // page_size if total_items > 0 else 0
            )
            
            # return the final response
            return RTIRequestListResponse(
                data=[RTIRequestResponse.model_validate(r) for r in results],
                pagination=pagination
            )
        except Exception as e:
            logger.error(f"Error fetching RTI requests: {e}")
            raise InternalServerException("Failed to fetch RTI requests from database.") from e
