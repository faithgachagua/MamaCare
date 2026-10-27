from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    email: str = Field(index=True, unique=True, nullable=False)
    full_name: str
    phone: Optional[str] = None
    hashed_password: str
    role: str = Field(default="mother", index=True)
    joined_at: datetime = Field(default_factory=utcnow)

    pregnancy_records: List["PregnancyRecord"] = Relationship(back_populates="user")
    ai_sessions: List["AISession"] = Relationship(back_populates="user")


class PregnancyRecord(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(foreign_key="user.id")
    stage: str = Field(default="pregnant")  # pregnant | postpartum
    lmp_date: Optional[date] = None
    due_date: Optional[date] = None
    delivery_date: Optional[date] = None
    gestational_age_weeks: int = Field(default=0)
    is_active: bool = Field(default=True)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    user: Optional[User] = Relationship(back_populates="pregnancy_records")
    symptoms: List["Symptom"] = Relationship(back_populates="pregnancy")
    vitals: List["Vital"] = Relationship(back_populates="pregnancy")


class Symptom(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(foreign_key="user.id")
    pregnancy_id: UUID = Field(foreign_key="pregnancyrecord.id")
    symptom_type: str
    severity: Optional[int] = None
    description: Optional[str] = None
    recorded_at: datetime = Field(default_factory=utcnow)

    user: Optional[User] = Relationship()
    pregnancy: Optional[PregnancyRecord] = Relationship(back_populates="symptoms")


class Vital(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(foreign_key="user.id")
    pregnancy_id: UUID = Field(foreign_key="pregnancyrecord.id")
    vital_type: str
    value_numeric: Optional[float] = None
    value_secondary: Optional[float] = None
    value_text: Optional[str] = None
    unit: Optional[str] = None
    recorded_at: datetime = Field(default_factory=utcnow)
    source: str = Field(default="manual")
    notes: Optional[str] = None

    user: Optional[User] = Relationship()
    pregnancy: Optional[PregnancyRecord] = Relationship(back_populates="vitals")


class AISession(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(foreign_key="user.id")
    title: Optional[str] = None
    context_summary: Optional[str] = None
    message_count: int = Field(default=0)
    last_active_at: datetime = Field(default_factory=utcnow)
    created_at: datetime = Field(default_factory=utcnow)

    user: Optional[User] = Relationship(back_populates="ai_sessions")
    messages: List["AIMessage"] = Relationship(back_populates="session")


class AIMessage(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    session_id: UUID = Field(foreign_key="aisession.id")
    role: str
    content: str
    created_at: datetime = Field(default_factory=utcnow)

    session: Optional[AISession] = Relationship(back_populates="messages")


class Baby(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    mother_id: UUID = Field(foreign_key="user.id", index=True)
    pregnancy_id: Optional[UUID] = Field(default=None, foreign_key="pregnancyrecord.id")
    name: Optional[str] = None
    birth_date: date
    sex: Optional[str] = None  # female | male | unknown
    birth_weight_g: Optional[int] = None
    created_at: datetime = Field(default_factory=utcnow)


class CareInvite(SQLModel, table=True):
    """A mother's invitation for someone to join her care circle."""

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    mother_id: UUID = Field(foreign_key="user.id", index=True)
    email: str = Field(index=True)
    role: str
    relationship_label: Optional[str] = None
    scopes: List[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    token: str = Field(index=True, unique=True)
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)


class ConsentGrant(SQLModel, table=True):
    """What a mother has agreed to share with one person. Revoking sets revoked_at."""

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    mother_id: UUID = Field(foreign_key="user.id", index=True)
    grantee_id: UUID = Field(foreign_key="user.id", index=True)
    role: str
    relationship_label: Optional[str] = None
    scopes: List[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=utcnow)
    revoked_at: Optional[datetime] = None


class AccessLog(SQLModel, table=True):
    """Every time someone other than the mother reads her data."""

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    mother_id: UUID = Field(foreign_key="user.id", index=True)
    viewer_id: UUID = Field(foreign_key="user.id")
    scopes: List[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    accessed_at: datetime = Field(default_factory=utcnow)
