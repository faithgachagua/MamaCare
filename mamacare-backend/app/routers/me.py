from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from ..core.security import get_current_user, current_mother
from ..content.vaccines import CODES
from ..crud import create_baby, get_active_pregnancy, get_babies, get_baby, get_given_doses, pregnancy_snapshot
from ..services.vaccinations import build_checklist
from ..db import get_session
from ..models import Baby, User, VaccineDose
from ..schemas import BabyCreate, BabyRead

router = APIRouter(prefix="/api", tags=["me"])


def baby_read(b: Baby) -> BabyRead:
    return BabyRead(id=str(b.id), name=b.name, birth_date=b.birth_date, sex=b.sex, birth_weight_g=b.birth_weight_g)


@router.get("/me")
async def me(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Who am I, what is my role, and (for mothers) where am I in the journey."""
    pregnancy = None
    babies = []
    if current_user.role == "mother":
        pregnancy = pregnancy_snapshot(get_active_pregnancy(session, str(current_user.id)))
        babies = [baby_read(b) for b in get_babies(session, str(current_user.id))]
    return {
        "user_id": str(current_user.id),
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "pregnancy": pregnancy,
        "babies": babies,
    }


@router.get("/babies", response_model=list[BabyRead])
async def list_babies(current_user: User = Depends(current_mother), session: Session = Depends(get_session)):
    return [baby_read(b) for b in get_babies(session, str(current_user.id))]


@router.post("/babies", response_model=BabyRead, status_code=201)
async def add_baby(
    payload: BabyCreate,
    current_user: User = Depends(current_mother),
    session: Session = Depends(get_session),
):
    """Record a birth. This also moves a pregnant mother to the postpartum stage."""
    return baby_read(create_baby(session, str(current_user.id), payload.model_dump()))


# ── Vaccinations ─────────────────────────────────────────────────────────────

class DoseGiven(BaseModel):
    given_date: date


def _baby_or_404(session: Session, mother: User, baby_id: UUID) -> Baby:
    baby = get_baby(session, str(mother.id), str(baby_id))
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found.")
    return baby


def _checklist(session: Session, baby: Baby) -> dict:
    items = build_checklist(baby.birth_date, get_given_doses(session, str(baby.id)))
    return {
        "baby": baby_read(baby),
        "items": items,
        "note": "Based on the routine schedule. Always check your Mother-Baby booklet or ask the clinic.",
    }


@router.get("/babies/{baby_id}/vaccinations")
async def vaccinations(baby_id: UUID, mother: User = Depends(current_mother), session: Session = Depends(get_session)):
    return _checklist(session, _baby_or_404(session, mother, baby_id))


@router.put("/babies/{baby_id}/vaccinations/{code}")
async def mark_given(
    baby_id: UUID,
    code: str,
    payload: DoseGiven,
    mother: User = Depends(current_mother),
    session: Session = Depends(get_session),
):
    baby = _baby_or_404(session, mother, baby_id)
    if code not in CODES:
        raise HTTPException(status_code=404, detail="Unknown vaccine.")
    if payload.given_date < baby.birth_date:
        raise HTTPException(status_code=422, detail="The date cannot be before the baby was born.")
    if payload.given_date > date.today():
        raise HTTPException(status_code=422, detail="The date cannot be in the future.")
    from sqlmodel import select

    row = session.exec(select(VaccineDose).where(VaccineDose.baby_id == baby.id, VaccineDose.vaccine_code == code)).first()
    if row:
        row.given_date = payload.given_date
    else:
        row = VaccineDose(baby_id=baby.id, vaccine_code=code, given_date=payload.given_date)
    session.add(row)
    session.commit()
    return _checklist(session, baby)


@router.delete("/babies/{baby_id}/vaccinations/{code}")
async def unmark_given(
    baby_id: UUID, code: str, mother: User = Depends(current_mother), session: Session = Depends(get_session)
):
    baby = _baby_or_404(session, mother, baby_id)
    from sqlmodel import select

    row = session.exec(select(VaccineDose).where(VaccineDose.baby_id == baby.id, VaccineDose.vaccine_code == code)).first()
    if row:
        session.delete(row)
        session.commit()
    return _checklist(session, baby)
