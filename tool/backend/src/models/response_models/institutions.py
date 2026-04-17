from datetime import datetime
from uuid import UUID
from src.models import PaginationModel
from typing import Sequence
from pydantic import BaseModel, ConfigDict, Field
    
class InstitutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    id: UUID = Field(..., description="Unique identifier for the institution")
    name: str = Field(..., description="Name of the institution")
    created_at: datetime = Field(..., description="ISO 8601 timestamp of when the institution was created")
    updated_at: datetime = Field(..., description="ISO 8601 timestamp of when the institution was last updated")

class InstitutionListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    data: Sequence[InstitutionResponse] = Field([], description="List of institutions")
    pagination: PaginationModel = Field(..., description="Pagination metadata")

