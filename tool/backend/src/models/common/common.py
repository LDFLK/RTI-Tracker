from pydantic import BaseModel, ConfigDict, Field

class PaginationModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    page: int = Field(1, ge=1, description="Current page number (1-indexed)")
    pageSize: int = Field(10, ge=1, le=100, description="Number of items per page")
    totalItems: int = Field(0, ge=0, description="Total number of items available")
    totalPages: int = Field(0, ge=0, description="Total number of pages based on pageSize")
