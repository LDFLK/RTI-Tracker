from pydantic import BaseModel, Field, ConfigDict, EmailStr, model_validator
from typing import Optional
from src.core.exceptions import BadRequestException


class StatusRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    name: str = Field(..., json_schema_extra={"example":"Delivery"}, description="Name of the status.")
