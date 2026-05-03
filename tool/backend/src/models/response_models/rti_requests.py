from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from src.models.common.common import PaginationModel
from .senders import SenderShortResponse
from .receivers import ReceiverShortResponse
from .rti_templates import RTITemplateShortResponse

class RTIRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Unique identifier for the RTI Request")
    title: str = Field(..., description="Title of the RTI Request")
    description: Optional[str] = Field(None, description="Detailed description of the RTI Request")
    sender: SenderShortResponse = Field(..., description="Sender object of the RTI Request")
    receiver: ReceiverShortResponse = Field(..., description="Receiver object of the RTI Request")
    rti_template: Optional[RTITemplateShortResponse] = Field(None, serialization_alias="rtiTemplate", description="RTI Template object")
    created_at: datetime = Field(..., serialization_alias="createdAt", description="ISO 8601 timestamp of when the RTI Request was created")
    updated_at: datetime = Field(..., serialization_alias="updatedAt", description="ISO 8601 timestamp of when the RTI Request was last updated")

class RTIRequestListResponse(BaseModel):
    data: List[RTIRequestResponse] = Field([], description="List of RTI Requests")
    pagination: PaginationModel = Field(..., description="Pagination metadata")
