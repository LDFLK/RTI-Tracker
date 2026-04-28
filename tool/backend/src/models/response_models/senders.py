from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Sequence
from src.models import PaginationModel


class SenderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    id: UUID = Field(
        ...,
        json_schema_extra={"example":"123e4567-e89b-12d3-a456-426614174000"},
        description="Unique identifier for the sender",
    )
    name: str = Field(..., json_schema_extra={"example":"John Doe"}, description="Name of the sender")
    email: Optional[str] = Field(
        None, json_schema_extra={"example":"example@gmail.com"}, description="Email of the sender"
    )
    address: Optional[str] = Field(
        None, json_schema_extra={"example":"123 Main St, Colombo 01"}, description="Address of the sender"
    )
    contact_no: Optional[str] = Field(
        None, serialization_alias="contactNo", json_schema_extra={"example":"0771234567"}, description="Contact number of the sender"
    )
    created_at: datetime = Field(
        ...,
        serialization_alias="createdAt",
        json_schema_extra={"example":"2026-03-31T09:00:00Z"},
        description="ISO 8601 timestamp of when the sender was created",
    )
    updated_at: datetime = Field(
        ...,
        serialization_alias="updatedAt",
        json_schema_extra={"example":"2026-03-31T09:00:00Z"},
        description="ISO 8601 timestamp of when the sender was last updated",
    )


class SenderListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    data: Sequence[SenderResponse] = Field([], description="List of senders.")
    pagination: PaginationModel = Field(..., description="Pagination metadata.")
