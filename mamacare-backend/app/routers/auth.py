from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..core.roles import STAGE_POSTPARTUM, STAGE_PREGNANT, STAGES
from ..core.security import create_access_token, hash_password, verify_password
from ..crud import (
    create_grant_from_invite,
    create_pregnancy,
    create_user,
    get_active_pregnancy,
    get_invite_by_token,
    get_user_by_email,
    invite_is_open,
    pregnancy_snapshot,
)
from ..db import get_session
from ..models import User
from ..schemas import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


def build_token_response(user: User, pregnancy) -> TokenResponse:
    snap = pregnancy_snapshot(pregnancy) or {}
    return TokenResponse(
        access_token=create_access_token(str(user.id), user.email),
        user_id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        stage=snap.get("stage"),
        pregnancy_id=snap.get("id"),
        gestational_age_weeks=snap.get("gestational_age_weeks"),
        weeks_postpartum=snap.get("weeks_postpartum"),
        due_date=snap.get("due_date"),
        delivery_date=snap.get("delivery_date"),
    )


def _validate_mother_dates(payload: RegisterRequest) -> None:
    today = datetime.now(timezone.utc).date()
    if payload.stage not in STAGES:
        raise HTTPException(status_code=422, detail="stage must be 'pregnant' or 'postpartum'.")
    if payload.stage == STAGE_PREGNANT:
        if not payload.lmp_date and not payload.due_date:
            raise HTTPException(status_code=422, detail="Either lmp_date or due_date is required.")
        if payload.lmp_date and payload.lmp_date > today:
            raise HTTPException(status_code=422, detail="Last period date cannot be in the future.")
        if payload.lmp_date and (today - payload.lmp_date).days > 300:
            raise HTTPException(status_code=422, detail="Last period date is too long ago for a current pregnancy.")
    else:
        if not payload.delivery_date:
            raise HTTPException(status_code=422, detail="delivery_date is required for postpartum.")
        if payload.delivery_date > today:
            raise HTTPException(status_code=422, detail="Delivery date cannot be in the future.")


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: RegisterRequest, session: Session = Depends(get_session)):
    email = payload.email.lower()
    invite = None
    if payload.invite_token:
        invite = get_invite_by_token(session, payload.invite_token)
        if not invite or not invite_is_open(invite):
            raise HTTPException(status_code=410, detail="This invitation is no longer valid.")
        if invite.email.lower() != email:
            raise HTTPException(status_code=403, detail="Use the email address the invitation was sent to.")
    else:
        _validate_mother_dates(payload)

    if get_user_by_email(session, email):
        raise HTTPException(status_code=409, detail="Email already registered.")

    user = create_user(
        session,
        email=email,
        full_name=payload.full_name.strip(),
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=invite.role if invite else "mother",
    )

    if invite:
        create_grant_from_invite(session, invite, user)
        return build_token_response(user, None)

    pregnancy = create_pregnancy(
        session,
        user_id=user.id,
        stage=payload.stage,
        lmp_date=payload.lmp_date,
        due_date=payload.due_date,
        delivery_date=payload.delivery_date,
    )
    return build_token_response(user, pregnancy)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: Session = Depends(get_session)):
    user = get_user_by_email(session, payload.email.lower())
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    pregnancy = get_active_pregnancy(session, str(user.id)) if user.role == "mother" else None
    return build_token_response(user, pregnancy)
