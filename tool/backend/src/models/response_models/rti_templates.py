
from fastapi import UploadFile
from datetime import datetime
from uuid import UUID
from src.models import PaginationModel
from typing import Sequence, Optional
from pydantic import BaseModel, ConfigDict, Field

    
class RTITemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    id: UUID = Field(..., description="Unique identifier for the RTI template")
    title: str = Field(..., description="Title of the RTI template")
    description: Optional[str] = Field(None, description="Detailed description of the RTI template")
    file: str = Field(..., description="Relative path of the markdown file")
    created_at: datetime = Field(..., description="ISO 8601 timestamp of when the template was created")
    updated_at: datetime = Field(..., description="ISO 8601 timestamp of when the template was last updated")

class RTITemplateListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    data: Sequence[RTITemplateResponse] = Field([], description="List of RTI templates.")
    pagination: PaginationModel = Field(..., description="Pagination metadata.")

