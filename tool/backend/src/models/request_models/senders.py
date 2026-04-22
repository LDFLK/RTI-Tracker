from pydantic import BaseModel, Field, ConfigDict, EmailStr, model_validator
from typing import Optional
from src.core.exceptions import BadRequestException


class SenderRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    name: str = Field(..., json_schema_extra={"example":"John Doe"}, description="Name of the sender.")
    email: Optional[EmailStr] = Field(
        None, json_schema_extra={"example":"example@gmail.com"}, description="Email of the sender."
    )
    address: Optional[str] = Field(
        None, json_schema_extra={"example":"123 Main St, Colombo 01"}, description="Address of the sender."
    )
    contact_no: Optional[str] = Field(
        None, pattern=r"^\+?\d{10,15}$", json_schema_extra={"example":"0771234567"}, description="Contact number of the sender."
    )

    # either email or contact_no must be provided
    @model_validator(mode="after")
    def validate_email_or_contact(self):
        if not self.email and not self.contact_no:
            raise BadRequestException("Either email or contact_no must be provided.")
        return self
