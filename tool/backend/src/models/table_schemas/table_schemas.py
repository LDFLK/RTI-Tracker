from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID
from enum import Enum
from sqlmodel import SQLModel, Field, func, CheckConstraint, Relationship
from sqlalchemy import Column, Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON

class RTIDirection(str, Enum):
    sent = "sent"
    received = "received"

class RTIStatusName(str, Enum):
    CREATED = "CREATED"
    APPROVAL = "APPROVAL"
    DELIVERY = "DELIVERY"
    ACKNOWLEDGE = "ACKNOWLEDGE"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"
    APPEAL = "APPEAL"

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

    # relationships
    rti_requests: List["RTIRequest"] = Relationship(back_populates="rti_template")
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
            "email IS NOT NULL OR contact_no IS NOT NULL", name="check_receivers_email_or_contact_no"
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

    rti_requests: List["RTIRequest"] = Relationship(back_populates="receiver")

class Sender(SQLModel, table=True):
    __tablename__ = "senders"

    __table_args__ = (
        CheckConstraint(
            "email IS NOT NULL OR contact_no IS NOT NULL", name="check_senders_email_or_contact_no"
        ),
    )
    # table fields
    id: UUID = Field(primary_key=True, description="Unique identifier for the sender")
    name: str = Field(description="Name of the sender")
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

    # relationships
    rti_requests: List["RTIRequest"] = Relationship(back_populates="sender")

class RTIRequest(SQLModel, table=True):
    __tablename__ = "rti_requests"

    # table fields
    id: UUID = Field(primary_key=True, description="Unique identifier for the rti request")
    title: str = Field(description="title of the rti request")
    description: Optional[str] = Field(default=None, description="description of the rti request")
    sender_id: UUID = Field(foreign_key="senders.id", description="ID of the sender")
    receiver_id: UUID = Field(foreign_key="receivers.id", description="ID of the receiver")
    rti_template_id: Optional[UUID] = Field(default=None, foreign_key="rti_templates.id", description="ID of the rti template")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 timestamp of when the rti request was created",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        description="ISO 8601 timestamp of when the rti request was last updated",
    )

    # relationships
    sender: Sender = Relationship(back_populates="rti_requests")
    receiver: Receiver = Relationship(back_populates="rti_requests")
    rti_template: Optional[RTITemplate] = Relationship(back_populates="rti_requests")
    rti_status_histories: List["RTIStatusHistories"] = Relationship(back_populates="rti_request")

class RTIStatus(SQLModel, table=True):
    __tablename__ = "rti_statuses"

    # table fields
    id: UUID = Field(primary_key=True, description="Unique identifier for the RTI Status")
    name: str = Field(unique=True, description="name of the RTI Status")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 timestamp of when the rti status was created",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        description="ISO 8601 timestamp of when the rti status was last updated",
    )

    # relationships
    rti_status_histories: List["RTIStatusHistories"] = Relationship(back_populates="rti_status")


class RTIStatusHistories(SQLModel, table=True):
    __tablename__ = "rti_status_histories"

    # table fields
    id: UUID = Field(primary_key=True, description="Unique identifier for the RTI Status History")
    rti_request_id: UUID = Field(foreign_key="rti_requests.id", description="Unique identifier for the RTI Request")
    status_id: UUID = Field(foreign_key="rti_statuses.id", description="Unique identifier for the RTI Status")
    direction: RTIDirection = Field(sa_column=Column(SAEnum(RTIDirection, name="rti_direction")), description="direction for the RTI Status History")
    description: Optional[str] = Field(default=None, description="description for the RTI Status History")
    entry_time: datetime = Field(description="entry time for the RTI Status History")
    exit_time: Optional[datetime] = Field(default=None, description="exit time for the RTI Status History")
    files: List[str] = Field(..., sa_column=Column(JSONB().with_variant(JSON, "sqlite")), description="List of URLs for the RTI status history files")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 timestamp of when the rti status history was created",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        description="ISO 8601 timestamp of when the rti status history was last updated",
    )

    # relationships
    rti_request: RTIRequest = Relationship(back_populates="rti_status_histories")
    rti_status: RTIStatus = Relationship(back_populates="rti_status_histories")


