from fastapi import UploadFile
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class RTITemplateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    id: Optional[str] = Field(None, description="ID of the RTI Template")
    title: Optional[str] = Field(None, description="Title of the RTI Template")
    description: Optional[str] = Field(None, description="Detailed description of the RTI Template")
    file: Optional[UploadFile] = Field(None, description="RTI Template markdown file")