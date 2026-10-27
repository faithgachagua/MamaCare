from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Union
from uuid import UUID

from sqlmodel import select, Session

from .core.roles import STAGE_POSTPARTUM, STAGE_PREGNANT
from .models import AccessLog, AIMessage, AISession, Baby, CareInvite, ConsentGrant, PregnancyRecord, Symptom, User, Vital


def _uuid(value: Union[str, UUID]) -> UUID:
    return value if isinstance(value, UUID) else UUID(str(value))


def _uuid_or_none(value: Union[str, UUID, None]) -> Optional[UUID]:
    try:
        return _uuid(value) if value is not None else None
    except ValueError:
        return None


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    statement = select(User).where(User.email == email)
    return session.exec(statement).first()


def get_user_by_id(session: Session, user_id: str) -> Optional[User]:
    statement = select(User).where(User.id == _uuid_or_none(user_id))
    return session.exec(statement).first()


def create_user(
    session: Session,
    email: str,
    full_name: str,
    hashed_password: str,
    phone: Optional[str] = None,
    role: str = "mother",
) -> User:
    user = User(email=email, full_name=full_name, phone=phone, hashed_password=hashed_password, role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _today() -> date:
    return datetime.now(timezone.utc).date()


def calculate_gestational_age_weeks(lmp_date: date) -> int:
    return max(0, min(42, (_today() - lmp_date).days // 7))


def current_gestational_weeks(pregnancy: PregnancyRecord) -> Optional[int]:
    """Weeks pregnant today. Computed on read so it never goes stale."""
    if pregnancy.stage != STAGE_PREGNANT or pregnancy.lmp_date is None:
        return None
    return calculate_gestational_age_weeks(pregnancy.lmp_date)


def weeks_postpartum(pregnancy: PregnancyRecord) -> Optional[int]:
    if pregnancy.stage != STAGE_POSTPARTUM or pregnancy.delivery_date is None:
        return None
    return max(0, (_today() - pregnancy.delivery_date).days // 7)


def pregnancy_snapshot(pregnancy: Optional[PregnancyRecord]) -> Optional[dict]:
    if pregnancy is None:
        return None
    return {
        "id": str(pregnancy.id),
        "stage": pregnancy.stage,
        "gestational_age_weeks": current_gestational_weeks(pregnancy),
        "weeks_postpartum": weeks_postpartum(pregnancy),
        "due_date": str(pregnancy.due_date) if pregnancy.due_date else None,
        "delivery_date": str(pregnancy.delivery_date) if pregnancy.delivery_date else None,
    }


def create_pregnancy(
    session: Session,
    user_id: Union[str, UUID],
    stage: str = STAGE_PREGNANT,
    lmp_date: Optional[date] = None,
    due_date: Optional[date] = None,
    delivery_date: Optional[date] = None,
    notes: Optional[str] = None,
) -> PregnancyRecord:
    if stage == STAGE_PREGNANT:
        if lmp_date is None and due_date is None:
            raise ValueError("Either lmp_date or due_date must be provided.")
        if lmp_date is None:
            lmp_date = due_date - timedelta(days=280)
        if due_date is None:
            due_date = lmp_date + timedelta(days=280)
    elif delivery_date is None:
        raise ValueError("delivery_date is required for postpartum.")

    record = PregnancyRecord(
        user_id=_uuid(user_id),
        stage=stage,
        lmp_date=lmp_date,
        due_date=due_date,
        delivery_date=delivery_date,
        gestational_age_weeks=calculate_gestational_age_weeks(lmp_date) if lmp_date else 0,
        notes=notes,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def get_active_pregnancy(session: Session, user_id: str) -> Optional[PregnancyRecord]:
    statement = (
        select(PregnancyRecord)
        .where(PregnancyRecord.user_id == _uuid(user_id), PregnancyRecord.is_active == True)
        .order_by(PregnancyRecord.created_at.desc())
    )
    return session.exec(statement).first()


def get_recent_symptoms(session: Session, user_id: str, limit: int = 5) -> List[Symptom]:
    statement = select(Symptom).where(Symptom.user_id == _uuid(user_id)).order_by(Symptom.recorded_at.desc()).limit(limit)
    return session.exec(statement).all()


def get_recent_vitals(session: Session, user_id: str, limit: int = 5) -> List[Vital]:
    statement = select(Vital).where(Vital.user_id == _uuid(user_id)).order_by(Vital.recorded_at.desc()).limit(limit)
    return session.exec(statement).all()


def get_upcoming_appointments(session: Session, user_id: str, limit: int = 5) -> List[dict]:
    # Placeholder for future appointment table.
    return []


def _coerce_ids(data: dict) -> dict:
    return {k: _uuid(v) if k in ("user_id", "pregnancy_id") else v for k, v in data.items()}


def create_symptom(session: Session, data: dict) -> Symptom:
    symptom = Symptom(**_coerce_ids(data))
    session.add(symptom)
    session.commit()
    session.refresh(symptom)
    return symptom


def create_vital(session: Session, data: dict) -> Vital:
    vital = Vital(**_coerce_ids(data))
    session.add(vital)
    session.commit()
    session.refresh(vital)
    return vital


def create_ai_session(session: Session, user_id: Optional[str] = None, title: Optional[str] = None) -> AISession:
    ai_session = AISession(user_id=_uuid(user_id) if user_id else None, title=title)
    session.add(ai_session)
    session.commit()
    session.refresh(ai_session)
    return ai_session


def get_ai_session(session: Session, session_id: str) -> Optional[AISession]:
    statement = select(AISession).where(AISession.id == _uuid_or_none(session_id))
    return session.exec(statement).first()


def append_ai_message(session: Session, session_id: str, role: str, content: str) -> AIMessage:
    message = AIMessage(session_id=_uuid(session_id), role=role, content=content)
    session.add(message)
    session.commit()
    session.refresh(message)

    ai_session = get_ai_session(session, session_id)
    if ai_session:
        ai_session.message_count += 1
        ai_session.last_active_at = datetime.now(timezone.utc)
        session.add(ai_session)
        session.commit()
    return message


def get_session_messages(session: Session, session_id: str, limit: int = 20) -> List[AIMessage]:
    statement = select(AIMessage).where(AIMessage.session_id == _uuid(session_id)).order_by(AIMessage.created_at.desc()).limit(limit)
    return session.exec(statement).all()[::-1]


def get_ai_sessions(session: Session, user_id: Optional[str] = None) -> List[AISession]:
    statement = select(AISession)
    if user_id:
        statement = statement.where(AISession.user_id == _uuid(user_id))
    statement = statement.order_by(AISession.last_active_at.desc())
    return session.exec(statement).all()


def update_session_summary(session: Session, session_id: str, summary: str) -> None:
    ai_session = get_ai_session(session, session_id)
    if ai_session:
        ai_session.context_summary = summary
        session.add(ai_session)
        session.commit()


# ── Babies ───────────────────────────────────────────────────────────────────

def create_baby(session: Session, mother_id: Union[str, UUID], data: dict) -> Baby:
    """Record a birth. If she was still pregnant, her journey moves to postpartum."""
    pregnancy = get_active_pregnancy(session, mother_id)
    baby = Baby(mother_id=_uuid(mother_id), pregnancy_id=pregnancy.id if pregnancy else None, **data)
    session.add(baby)
    if pregnancy and pregnancy.stage == STAGE_PREGNANT:
        pregnancy.stage = STAGE_POSTPARTUM
        pregnancy.delivery_date = baby.birth_date
        pregnancy.updated_at = datetime.now(timezone.utc)
        session.add(pregnancy)
    session.commit()
    session.refresh(baby)
    return baby


def get_babies(session: Session, mother_id: Union[str, UUID]) -> List[Baby]:
    statement = select(Baby).where(Baby.mother_id == _uuid(mother_id)).order_by(Baby.birth_date.desc())
    return list(session.exec(statement).all())


# ── Care circle ──────────────────────────────────────────────────────────────

def get_invite_by_token(session: Session, token: str) -> Optional[CareInvite]:
    return session.exec(select(CareInvite).where(CareInvite.token == token)).first()


def invite_is_open(invite: CareInvite) -> bool:
    expires = invite.expires_at if invite.expires_at.tzinfo else invite.expires_at.replace(tzinfo=timezone.utc)
    return invite.accepted_at is None and invite.revoked_at is None and expires > datetime.now(timezone.utc)


def create_grant_from_invite(session: Session, invite: CareInvite, grantee: User) -> ConsentGrant:
    grant = ConsentGrant(
        mother_id=invite.mother_id,
        grantee_id=grantee.id,
        role=invite.role,
        relationship_label=invite.relationship_label,
        scopes=list(invite.scopes),
    )
    invite.accepted_at = datetime.now(timezone.utc)
    session.add(grant)
    session.add(invite)
    session.commit()
    session.refresh(grant)
    return grant


def get_active_grant(session: Session, mother_id: Union[str, UUID], grantee_id: Union[str, UUID]) -> Optional[ConsentGrant]:
    statement = select(ConsentGrant).where(
        ConsentGrant.mother_id == _uuid(mother_id),
        ConsentGrant.grantee_id == _uuid(grantee_id),
        ConsentGrant.revoked_at == None,  # noqa: E711
    )
    return session.exec(statement).first()


def log_access(session: Session, mother_id: UUID, viewer_id: UUID, scopes: List[str]) -> None:
    session.add(AccessLog(mother_id=mother_id, viewer_id=viewer_id, scopes=list(scopes)))
    session.commit()
