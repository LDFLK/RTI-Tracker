from datetime import datetime
from typing import Optional
from uuid import UUID
from sqlmodel import SQLModel, Field

class RTITemplate(SQLModel, table=True):
    __tablename__ = "rti_templates"

    # table fields
    id: UUID = Field(primary_key=True, description="Unique identifier for the RTI template")
    title: str = Field(index=True, unique=True, description="Title of the RTI template")
    description: Optional[str] = Field(None, description="Detailed description of the RTI template")
    file: str = Field(..., description="Content of the RTI template in Markdown format")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="ISO 8601 timestamp of when the template was created")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="ISO 8601 timestamp of when the template was last updated")