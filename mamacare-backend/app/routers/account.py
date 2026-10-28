"""My own account: name, phone and password."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from ..core.security import get_current_user, hash_password, verify_password
from ..db import get_session
from ..models import User

router = APIRouter(prefix="/api/account", tags=["account"])


class AccountRead(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str


class AccountUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=30)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


def _read(u: User) -> AccountRead:
    return AccountRead(full_name=u.full_name, email=u.email, phone=u.phone, role=u.role)


@router.get("", response_model=AccountRead)
async def get_account(user: User = Depends(get_current_user)):
    return _read(user)


@router.patch("", response_model=AccountRead)
async def update_account(payload: AccountUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    user.full_name = payload.full_name.strip()
    user.phone = (payload.phone or "").strip() or None
    session.add(user)
    session.commit()
    session.refresh(user)
    return _read(user)


@router.post("/password", status_code=204)
async def change_password(payload: PasswordChange, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Your current password is not correct.")
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=422, detail="Choose a password different from your current one.")
    user.hashed_password = hash_password(payload.new_password)
    session.add(user)
    session.commit()
