from fastapi import UploadFile
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class RTIRequestRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True, str_strip_whitespace=True, populate_by_name=True)

    id: Optional[str] = Field(None, description="ID of the RTI Request")
    title: str = Field(..., description="Title of the RTI Request")
    description: Optional[str] = Field(None, description="Detailed description of the RTI Request")
    sender_id: UUID = Field(..., alias="senderId", description="ID of the sender")
    receiver_id: UUID = Field(..., alias="receiverId", description="ID of the receiver")
    rti_template_id: Optional[UUID] = Field(None, alias="rtiTemplateId", description="ID of the RTI Template")
    file: UploadFile = Field(..., description="RTI Request file (pdf or doc)")
