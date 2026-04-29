import os
import re
import logging
from uuid import UUID, uuid4
from typing import Dict
from sqlalchemy.exc import IntegrityError
from sqlmodel import select, Session

from src.services.github_file_service import GithubFileService
from src.models.table_schemas.table_schemas import RTIRequest, RTIStatus, RTIStatusHistories, RTIDirection, Receiver
from src.models.response_models.rti_requests import RTIRequestResponse
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
            if not ext or ext.lower() not in [".pdf", ".doc", ".docx"]:
                raise BadRequestException(f"{request_data.file.filename} doesn't have a valid extension (.pdf, .doc, .docx)")

            # 2. Format directory name
            # Fetch receiver to get the name
            receiver = self.session.get(Receiver, request_data.receiver_id)
            if not receiver:
                raise BadRequestException(f"Receiver with id {request_data.receiver_id} not found")
            
            receiver_name = f"{receiver.position.name} {receiver.institution.name}"
            
            # truncate title up to 10 words
            title_words = request_data.title.split()[:10]
            truncated_title = " ".join(title_words)
            
            # directory name: Title of the RTI - Receiver Name - unique_id
            raw_directory_name = f"{truncated_title} - {receiver_name} - {unique_id}"
            
            # sanitize for directory name (replace invalid chars but keep spaces and dashes)
            directory_name = re.sub(r'[^a-zA-Z0-9\s\-]+', '', raw_directory_name).strip()
            file_path = f"rti-requests/{directory_name}/{unique_id}{ext.lower()}"

            # 3. Upload file
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

            # 4. Insert RTIRequest
            rti_request = RTIRequest(
                id=unique_id,
                title=request_data.title,
                description=request_data.description,
                sender_id=request_data.sender_id,
                receiver_id=request_data.receiver_id,
                rti_template_id=request_data.rti_template_id
            )
            self.session.add(rti_request)

            # 5. Insert RTIStatusHistories
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
