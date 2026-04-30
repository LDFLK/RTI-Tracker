from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID
from sqlmodel import SQLModel, Field, func, CheckConstraint, Relationship


class RTITemplate(SQLModel, table=True):
    __tablename__ = "rti_templates"

    # table fields
    id: UUID = Field(
        primary_key=True, description="Unique identifier for the RTI template"
    )
    title: str = Field(index=True, unique=True, description="Title of the RTI template")
    description: Optional[str] = Field(
        None, description="Detailed description of the RTI template"
    )
    file: str = Field(..., description="URL of the RTI template markdown file")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="ISO 8601 timestamp of when the template was created")
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": func.now()},
        description="ISO 8601 timestamp of when the template was last updated"
    )

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

    # relationship
    receivers: List["Receiver"] = Relationship(back_populates="institution")
    

class Position(SQLModel, table=True):
    __tablename__ = "positions"

    # table fields
    id: UUID = Field(primary_key=True, description="Unique identifier for the position")
    name: str = Field(index=True, unique=True, description="Name of the position")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="ISO 8601 timestamp of when the position was created")
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        description="ISO 8601 timestamp of when the position was last updated"
    )

    # relationship
    receivers: List["Receiver"] = Relationship(back_populates="position")


class Receiver(SQLModel, table=True):
    __tablename__ = "receivers"

    __table_args__ = (
        CheckConstraint(
            "email IS NOT NULL OR contact_no IS NOT NULL", name="check_email_or_contact_receiver"
        ),
    )

    # table fields
    id: UUID = Field(primary_key=True, description="Unique identifier for the receiver")
    position_id: UUID = Field(foreign_key="positions.id", description="ID of the position")
    institution_id: UUID = Field(foreign_key="institutions.id", description="ID of the institution")
    email: Optional[str] = Field(None, unique=True, description="Email of the receiver")
    address: Optional[str] = Field(None, description="Address of the receiver")
    contact_no: Optional[str] = Field(None, unique=True, description="Contact number of the receiver")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 timestamp of when the receiver was created",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        description="ISO 8601 timestamp of when the receiver was last updated",
    )

    # Relationships
    position: Position = Relationship(back_populates="receivers")
    institution: Institution = Relationship(back_populates="receivers")


class Sender(SQLModel, table=True):
    __tablename__ = "senders"

    __table_args__ = (
        CheckConstraint(
            "email IS NOT NULL OR contact_no IS NOT NULL", name="check_email_or_contact"
        ),
    )
    # table fields
    id: UUID = Field(primary_key=True, description="Unique identifier for the sender")
    name: str = Field(index=True, description="Name of the sender")
    email: Optional[str] = Field(None, unique=True, description="Email of the sender")
    address: Optional[str] = Field(None, description="Address of the sender")
    contact_no: Optional[str] = Field(None, unique=True, description="Contact number of the sender")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 timestamp of when the sender was created",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        description="ISO 8601 timestamp of when the sender was last updated",
    )
