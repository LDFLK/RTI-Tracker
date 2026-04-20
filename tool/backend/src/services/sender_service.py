from sqlmodel import Session
from src.models import SenderRequest, SenderResponse, Sender
from src.core.exceptions import InternalServerException, BadRequestException
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)

class SenderService:
    """
    This service is responsible for executing all sender related operations
    """

    def __init__ (self, session: Session):
        self.session = session
    
    # API
    # create sender
    def create_sender(
        self,
        *,
        template_request: SenderRequest
    ) -> SenderResponse:
        try:
            # generate a uuid
            unique_id = uuid4()

            # create sender
            sender = Sender(
                id=unique_id,
                name=template_request.name,
                email=template_request.email,
                address=template_request.address,
                contactNo=template_request.contactNo
            )

            self.session.add(sender)
            self.session.commit()
            self.session.refresh(sender)

            return SenderResponse.model_validate(sender)

        except BadRequestException:
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[SENDER SERVICE] Error creating sender: {e}")
            raise InternalServerException(f"[SENDER SERVICE] Failed to create sender: {e}") from e

    
