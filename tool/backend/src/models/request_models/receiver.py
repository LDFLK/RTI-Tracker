from pydantic import BaseModel, Field, ConfigDict, EmailStr, model_validator
from typing import Optional
from uuid import UUID
from src.core.exceptions import BadRequestException

class ReceiverUpdateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True, populate_by_name=True)
    
    position_id: Optional[UUID] = Field(None, alias="positionId", description="ID of the position")
    institution_id: Optional[UUID] = Field(None, alias="institutionId", description="ID of the institution")
    email: Optional[EmailStr] = Field(None, description="Email of the receiver")
    address: Optional[str] = Field(None, description="Address of the receiver")
    contact_no: Optional[str] = Field(None, alias="contactNo", pattern=r"^(?:\+94|0)\d{9}$", description="Contact number of the receiver")

class ReceiverRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True, populate_by_name=True)
    
    position_id: UUID = Field(..., alias="positionId", description="ID of the position")
    institution_id: UUID = Field(..., alias="institutionId", description="ID of the institution")
    email: Optional[EmailStr] = Field(None, description="Email of the receiver")
    address: Optional[str] = Field(None, description="Address of the receiver")
    contact_no: Optional[str] = Field(None, alias="contactNo", pattern=r"^(?:\+94|0)\d{9}$", description="Contact number of the receiver")

    @model_validator(mode="after")
    def validate_email_or_contact(self):
        if not self.email and not self.contact_no:
            raise BadRequestException("Either email or contactNo must be provided.")
        return self
