from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ── Auth ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(min_length=8, max_length=128)
    # Mothers only: where she is in her journey.
    stage: str = "pregnant"  # pregnant | postpartum
    lmp_date: Optional[date] = None
    due_date: Optional[date] = None
    delivery_date: Optional[date] = None
    # Partner / family / doctor sign-up through a mother's invitation.
    invite_token: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: str
    email: str
    role: str = "mother"
    stage: Optional[str] = None
    pregnancy_id: Optional[str] = None
    gestational_age_weeks: Optional[int] = None
    weeks_postpartum: Optional[int] = None
    due_date: Optional[str] = None
    delivery_date: Optional[str] = None


# ── Health ───────────────────────────────────────────────────────────────────

class SymptomCreate(BaseModel):
    symptom_type: str
    severity: Optional[int] = None
    description: Optional[str] = None


class VitalCreate(BaseModel):
    vital_type: str
    value_numeric: Optional[float] = None
    value_secondary: Optional[float] = None
    value_text: Optional[str] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class HealthSummary(BaseModel):
    user_id: str
    full_name: str
    due_date: Optional[date] = None
    gestational_age_weeks: Optional[int] = None
    recent_symptoms: List[SymptomCreate] = []
    recent_vitals: List[VitalCreate] = []


# ── AI ───────────────────────────────────────────────────────────────────────

class AiChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None


class AiChatResponse(BaseModel):
    answer: str
    session_id: str


class AiSessionRead(BaseModel):
    id: str
    title: Optional[str] = None
    last_active_at: datetime

    class Config:
        from_attributes = True


class AIMessageRead(BaseModel):
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Babies ───────────────────────────────────────────────────────────────────

class BabyCreate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=80)
    birth_date: date
    sex: Optional[str] = None  # female | male | unknown
    birth_weight_g: Optional[int] = Field(default=None, ge=300, le=7000)


class BabyRead(BaseModel):
    id: str
    name: Optional[str] = None
    birth_date: date
    sex: Optional[str] = None
    birth_weight_g: Optional[int] = None


# ── Care circle ──────────────────────────────────────────────────────────────

class InviteCreate(BaseModel):
    email: EmailStr
    role: str  # partner | family | doctor
    relationship_label: Optional[str] = Field(default=None, max_length=60)
    scopes: Optional[List[str]] = None  # defaults by role when omitted


class InviteRead(BaseModel):
    id: str
    email: str
    role: str
    relationship_label: Optional[str] = None
    scopes: List[str]
    token: str
    expires_at: datetime


class InvitePreview(BaseModel):
    mother_name: str
    email: str
    role: str
    relationship_label: Optional[str] = None
    scopes: List[str]


class GrantRead(BaseModel):
    id: str
    grantee_id: str
    grantee_name: str
    grantee_email: str
    role: str
    relationship_label: Optional[str] = None
    scopes: List[str]
    created_at: datetime


class GrantUpdate(BaseModel):
    scopes: List[str]


class CircleEntry(BaseModel):
    mother_id: str
    mother_name: str
    role: str
    relationship_label: Optional[str] = None
    scopes: List[str]
