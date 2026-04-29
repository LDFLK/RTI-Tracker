from datetime import datetime
from uuid import UUID
from src.models import PaginationModel
from typing import Sequence
from pydantic import BaseModel, ConfigDict, Field
    
class PositionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    id: UUID = Field(..., description="Unique identifier for the position")
    name: str = Field(...,description="Name of the position")
    created_at: datetime = Field(..., serialization_alias="createdAt", description="ISO 8601 timestamp of when the position was created")
    updated_at: datetime = Field(..., serialization_alias="updatedAt", description="ISO 8601 timestamp of when the position was last updated")

class PositionShortResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    id: UUID = Field(..., description="Unique identifier for the position")
    name: str = Field(..., description="Name of the position")

class PositionListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    data: Sequence[PositionResponse] = Field([], description="List of positions")
    pagination: PaginationModel = Field(..., description="Pagination metadata")
