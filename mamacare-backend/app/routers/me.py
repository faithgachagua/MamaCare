from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..core.security import get_current_user, current_mother
from ..crud import create_baby, get_active_pregnancy, get_babies, pregnancy_snapshot
from ..db import get_session
from ..models import Baby, User
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
