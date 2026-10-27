from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..core.security import current_mother
from ..content import symptoms as catalog
from ..crud import pregnancy_snapshot, create_symptom, create_vital, get_active_pregnancy, get_recent_symptoms, get_recent_vitals
from ..db import get_session
from ..models import User
from ..schemas import SymptomCreate, VitalCreate

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/summary")
async def get_health_summary(
    current_user: User = Depends(current_mother),
    session: Session = Depends(get_session),
):
    pregnancy = get_active_pregnancy(session, str(current_user.id))
    if not pregnancy:
        raise HTTPException(status_code=404, detail="Active pregnancy not found.")

    symptoms = get_recent_symptoms(session, str(current_user.id))
    vitals = get_recent_vitals(session, str(current_user.id))

    return {
        "user_id": str(current_user.id),
        "full_name": current_user.full_name,
        "pregnancy": pregnancy_snapshot(pregnancy),
        "symptoms": [s.model_dump() for s in symptoms],
        "vitals": [v.model_dump() for v in vitals],
    }


@router.post("/symptoms")
async def record_symptom(
    symptom: SymptomCreate,
    current_user: User = Depends(current_mother),
    session: Session = Depends(get_session),
):
    pregnancy = get_active_pregnancy(session, str(current_user.id))
    if pregnancy and catalog.lookup(pregnancy.stage, symptom.symptom_type) is None:
        raise HTTPException(status_code=422, detail=f"Unknown symptom: {symptom.symptom_type}.")
    if symptom.severity is not None and not 1 <= symptom.severity <= 5:
        raise HTTPException(status_code=422, detail="Severity must be from 1 to 5.")
    symptom_data = symptom.model_dump(exclude_none=True)
    if not pregnancy:
        raise HTTPException(status_code=404, detail="Active pregnancy not found.")
    symptom_data["user_id"] = str(current_user.id)
    symptom_data["pregnancy_id"] = str(pregnancy.id)
    return create_symptom(session, symptom_data)


@router.post("/vitals")
async def record_vital(
    vital: VitalCreate,
    current_user: User = Depends(current_mother),
    session: Session = Depends(get_session),
):
    pregnancy = get_active_pregnancy(session, str(current_user.id))
    _validate_vital(vital)
    vital_data = vital.model_dump(exclude_none=True)
    vital_data["unit"] = catalog.VITALS[vital.vital_type][1]
    if not pregnancy:
        raise HTTPException(status_code=404, detail="Active pregnancy not found.")
    vital_data["user_id"] = str(current_user.id)
    vital_data["pregnancy_id"] = str(pregnancy.id)
    return create_vital(session, vital_data)


def _validate_vital(vital: VitalCreate) -> None:
    spec = catalog.VITALS.get(vital.vital_type)
    if spec is None:
        raise HTTPException(status_code=422, detail=f"Unknown measurement: {vital.vital_type}.")
    label, _, low, high = spec
    if vital.value_numeric is None or not low <= vital.value_numeric <= high:
        raise HTTPException(status_code=422, detail=f"{label} must be between {low} and {high}.")
    if vital.vital_type == "blood_pressure":
        dia = vital.value_secondary
        if dia is None or not 30 <= dia <= 200 or dia >= vital.value_numeric:
            raise HTTPException(status_code=422, detail="Enter both numbers, with the top number higher than the bottom.")
