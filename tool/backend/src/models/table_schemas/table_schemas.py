from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlmodel import SQLModel, Field

class RTITemplate(SQLModel, table=True):
    __tablename__ = "rti_templates"

    # table fields
    id: UUID = Field(primary_key=True, description="Unique identifier for the RTI template")
    title: str = Field(index=True, unique=True, description="Title of the RTI template")
    description: Optional[str] = Field(None, description="Detailed description of the RTI template")
    file: str = Field(..., description="URL of the RTI template markdown file")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="ISO 8601 timestamp of when the template was created")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="ISO 8601 timestamp of when the template was last updated")

class Institution(SQLModel, table=True):
    __tablename__ = "institutions"

    # table fields
    id: UUID = Field(primary_key=True, description="Unique identifier for the institution")
    name: str = Field(index=True, unique=True, description="Name of the institution")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="ISO 8601 timestamp of when the institution was created")
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        description="ISO 8601 timestamp of when the institution was last updated"
    )
    