from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timezone

class PaginationModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    page: int = Field(1, ge=1, description="Current page number (1-indexed)")
    pageSize: int = Field(10, ge=1, le=100, description="Number of items per page")
    totalItem: int = Field(0, ge=0, description="Total number of items available")
    totalPages: int = Field(0, ge=0, description="Total number of pages based on pageSize")

class ErrorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    status: int = Field(..., description="HTTP status code")
    error: str = Field(..., description="Short error category")
    message: str = Field(..., description="Human-readable error detail")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 timestamp of when the error occurred (UTC)"
    )