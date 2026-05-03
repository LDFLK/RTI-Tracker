import os
import logging
from uuid import UUID, uuid4
from typing import Dict
from sqlalchemy.exc import IntegrityError
from sqlmodel import select, Session, func
from src.models import PaginationModel
from src.services.github_file_service import GithubFileService
from src.models.table_schemas.table_schemas import RTIRequest, RTIStatus, RTIStatusHistories, RTIDirection, Receiver, Sender, RTITemplate, RTIStatusName
from src.models.response_models.rti_requests import RTIRequestResponse, RTIRequestListResponse
from src.models.request_models.rti_requests import RTIRequestRequest, RTIRequestUpdateRequest
from src.core.exceptions import InternalServerException, BadRequestException, NotFoundException, ConflictException
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class RTIRequestService:
    """
    This service is responsible for executing all RTI request operations.
    """
    ALLOWED_FILE_TYPES = [".pdf"]

    def __init__(self, session: Session, file_service: GithubFileService):
        self.session = session
        self.file_service = file_service

    async def create_rti_request(
        self,
        *,
        request_data: RTIRequestRequest
    ) -> RTIRequestResponse:
        committed = False
        try:
            unique_id = uuid4()
            uploaded_file_path: str | None = None

            # 1. validate file extension
            if not request_data.file:
                raise BadRequestException("RTI Request file is required")

            _, ext = os.path.splitext(request_data.file.filename)
            if not ext or ext.lower() not in self.ALLOWED_FILE_TYPES:
                raise BadRequestException(f"{request_data.file.filename} doesn't have a valid extension ({', '.join(self.ALLOWED_FILE_TYPES)})")

            # 1.1 Validate foreign keys
            if not self.session.get(Sender, request_data.sender_id):
                raise NotFoundException(f"Sender with id {request_data.sender_id} not found.")
            if not self.session.get(Receiver, request_data.receiver_id):
                raise NotFoundException(f"Receiver with id {request_data.receiver_id} not found.")
            if request_data.rti_template_id and not self.session.get(RTITemplate, request_data.rti_template_id):
                raise NotFoundException(f"RTI Template with id {request_data.rti_template_id} not found.")
    
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
            statement = select(RTIStatus).where(RTIStatus.name == RTIStatusName.CREATED)
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
            committed = True
            self.session.refresh(rti_request)

            return RTIRequestResponse.model_validate(rti_request)

        except (BadRequestException, NotFoundException, ConflictException, InternalServerException):
            raise
        except Exception as e:
            if not committed:
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
            statement_records = select(RTIRequest).order_by(RTIRequest.created_at.desc()).offset(offset).limit(page_size)
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

    # API
    def get_rti_request_by_id(
        self,
        *,
        request_id: UUID
    ) -> RTIRequestResponse:
        """Fetches a single RTI Request by its ID."""
        try:
            try:
                target_id = UUID(request_id) if isinstance(request_id, str) else request_id
            except ValueError:
                raise BadRequestException(f"Invalid UUID format: {request_id}")

            rti_request = self.session.get(RTIRequest, target_id)

            if not rti_request:
                raise NotFoundException(f"RTI Request with id {request_id} not found.")

            return RTIRequestResponse.model_validate(rti_request)

        except (BadRequestException, NotFoundException):
            raise
        except Exception as e:
            logger.error(f"[RTI SERVICE] Error reading RTI request: {e}")
            raise InternalServerException(f"Failed to read RTI request: {e}") from e

    # API
    async def update_rti_request(
        self,
        *,
        request_data: RTIRequestUpdateRequest
    ) -> RTIRequestResponse:
        """Updates an existing RTI Request."""
        committed = False
        try:
            target_id = request_data.id
            if not target_id:
                raise BadRequestException("RTI Request ID is required for update")

            rti_request = self.session.get(RTIRequest, target_id)
            if not rti_request:
                raise NotFoundException(f"RTI Request with id {target_id} not found.")

            # Check if request has progressed
            statement_histories = select(RTIStatusHistories).where(RTIStatusHistories.rti_request_id == target_id)
            histories = self.session.exec(statement_histories).all()
            if len(histories) > 1:
                raise ConflictException("Cannot update RTI Request because it has associated status history records beyond creation.")

            # Validate foreign keys if they are being updated
            update_data = request_data.model_dump(exclude_unset=True)
            if update_data.get("sender_id") and not self.session.get(Sender, update_data["sender_id"]):
                raise NotFoundException(f"Sender with id {update_data['sender_id']} not found.")
            if update_data.get("receiver_id") and not self.session.get(Receiver, update_data["receiver_id"]):
                raise NotFoundException(f"Receiver with id {update_data['receiver_id']} not found.")
            if update_data.get("rti_template_id") and not self.session.get(RTITemplate, update_data["rti_template_id"]):
                raise NotFoundException(f"RTI Template with id {update_data['rti_template_id']} not found.")

            old_file_data: Dict | None = None
            old_file_path: str | None = None
            new_file_path: str | None = None

            # 1. Update file if provided
            if request_data.file:
                _, ext = os.path.splitext(request_data.file.filename)
                if not ext or ext.lower() not in self.ALLOWED_FILE_TYPES:
                    raise BadRequestException(f"{request_data.file.filename} doesn't have a valid extension ({', '.join(self.ALLOWED_FILE_TYPES)})")

                # Find the 'CREATED' status history to get the current file path
                status_statement = select(RTIStatus).where(RTIStatus.name == RTIStatusName.CREATED)
                created_status = self.session.exec(status_statement).first()

                if not created_status:
                    raise InternalServerException("Status 'CREATED' not found in database.")

                history_statement = select(RTIStatusHistories).where(
                    RTIStatusHistories.rti_request_id == target_id,
                    RTIStatusHistories.status_id == created_status.id
                )
                status_history = self.session.exec(history_statement).first()

                if not status_history or not status_history.files:
                    raise InternalServerException("Initial file record not found for this RTI Request.")

                old_file_path = status_history.files[0]
                new_file_content = await request_data.file.read()

                # If extension is same, update in place. If different, create new & delete old.
                _, old_ext = os.path.splitext(old_file_path)
                
                if ext.lower() == old_ext.lower():
                    # Same extension: Update existing file
                    old_file_data = await self.file_service.read_file(old_file_path)
                    response = await self.file_service.update_file(
                        file_path=old_file_path,
                        content=new_file_content,
                        sha=old_file_data["sha"],
                        message=f"Update content for RTI Request {target_id}"
                    )
                else:
                    # Different extension: Create new, will delete old on success
                    new_file_path = f"rti-requests/{target_id}/{target_id}{ext.lower()}"
                    response = await self.file_service.create_file(
                        file_path=new_file_path,
                        content=new_file_content,
                        message=f"Update file (new extension) for RTI Request {target_id}"
                    )
                    status_history.files = [new_file_path]
                    self.session.add(status_history)

            # Update other fields
            for key, value in update_data.items():
                if key not in ["id", "file"] and value is not None and hasattr(rti_request, key):
                    setattr(rti_request, key, value)

            self.session.add(rti_request)
            self.session.commit()
            committed = True
            
            # If extension changed and commit succeeded, delete the old file
            if new_file_path and old_file_path:
                try:
                    await self.file_service.delete_file(file_path=old_file_path)
                except Exception as ex:
                    # We log the failure but do not raise it, as the DB is already committed
                    # referencing the new file. The old file is now an orphan.
                    logger.error(f"[RTI SERVICE] Failed to delete old file {old_file_path} from GitHub after commit: {ex}")

            self.session.refresh(rti_request)
            return RTIRequestResponse.model_validate(rti_request)

        except (BadRequestException, NotFoundException, ConflictException, InternalServerException):
            raise
        except Exception as e:
            if not committed:
                self.session.rollback()
                
                # Compensating transactions for file updates (only if NOT committed)
                if old_file_data and old_file_path:
                    # Restore old version
                    try:
                        current_file_data = await self.file_service.read_file(old_file_path)
                        await self.file_service.update_file(
                            file_path=old_file_path,
                            content=old_file_data["content"],
                            sha=current_file_data["sha"],
                            message=f"Rollback: restore previous version for {target_id}"
                        )
                    except Exception as ex:
                        logger.error(f"[RTI SERVICE] Rollback failed (restore old): {ex}")
                elif new_file_path:
                    # Delete newly created file
                    try:
                        await self.file_service.delete_file(file_path=new_file_path)
                    except Exception as ex:
                        logger.error(f"[RTI SERVICE] Rollback failed (delete new): {ex}")

            if isinstance(e, IntegrityError):
                logger.error(f"[RTI SERVICE] Integrity error updating RTI request: {e}")
                raise ConflictException("Database integrity error occurred while updating the RTI Request.") from e

            logger.error(f"[RTI SERVICE] Error updating RTI request: {e}")
            raise InternalServerException(f"Failed to update RTI request: {e}") from e

    # API
    async def delete_rti_request(
        self,
        *,
        request_id: UUID
    ) -> None:
        """Deletes an RTI Request and its associated history and files."""
        try:
            target_id = request_id
            rti_request = self.session.get(RTIRequest, target_id)
            if not rti_request:
                raise NotFoundException(f"RTI Request with id {target_id} not found.")

            # 1. Fetch all histories and their files
            statement = select(RTIStatusHistories).where(RTIStatusHistories.rti_request_id == target_id)
            histories = self.session.exec(statement).all()
            
            # If there are more than 1 history record, it means the request has progressed
            # and should not be deleted according to business rules.
            if len(histories) > 1:
                raise ConflictException("Cannot delete RTI Request because it has associated status history records beyond creation.")

            all_file_paths = []
            for history in histories:
                if history.files:
                    all_file_paths.extend(history.files)

            # 2. Perform DB Deletion
            try:
                # Delete histories
                for history in histories:
                    self.session.delete(history)

                # Delete the request
                self.session.delete(rti_request)
                self.session.commit()

            except IntegrityError:
                self.session.rollback()
                raise ConflictException("Cannot delete RTI Request because it is connected to other entities.")

            # 3. Clean up files from GitHub after successful DB deletion
            # If this fails, we log it as orphaned files for manual cleanup.
            for file_path in all_file_paths:
                try:
                    await self.file_service.delete_file(file_path=file_path)
                except Exception as ex:
                    logger.error(f"[RTI SERVICE] Failed to delete orphaned file from GitHub: {file_path}. Error: {ex}")

        except (BadRequestException, NotFoundException, ConflictException):
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[RTI SERVICE] Error deleting RTI request: {e}")
            raise InternalServerException(f"Failed to delete RTI request: {e}") from e
    

            