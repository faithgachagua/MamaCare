"""What the mother sees when she opens the app: her week, her checkups and any warning signs."""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..content import journey, symptoms as catalog
from ..core.security import current_mother
from ..crud import (
    current_gestational_weeks,
    get_active_pregnancy,
    get_babies,
    get_recent_symptoms,
    get_recent_vitals,
    pregnancy_snapshot,
    weeks_postpartum,
)
from ..db import get_session
from ..models import ConsentGrant, PregnancyRecord, User
from ..services import insights as rules

router = APIRouter(prefix="/api", tags=["home"])

POSTPARTUM_WINDOW_WEEKS = 6


def _require_pregnancy(session: Session, mother: User) -> PregnancyRecord:
    pregnancy = get_active_pregnancy(session, str(mother.id))
    if not pregnancy:
        raise HTTPException(status_code=404, detail="No active pregnancy or postpartum record.")
    return pregnancy


def _checkups(pregnancy: PregnancyRecord) -> list[dict]:
    """Recommended contacts, with approximate dates when we can work them out."""
    out = []
    if pregnancy.stage == "pregnant" and pregnancy.lmp_date:
        week_now = current_gestational_weeks(pregnancy) or 0
        for week, title in journey.ANTENATAL_CONTACTS:
            out.append(
                {
                    "week": week,
                    "title": title,
                    "who": "Mother",
                    "approx_date": str(pregnancy.lmp_date + timedelta(weeks=week)),
                    "status": "passed" if week < week_now else "current" if week == week_now else "upcoming",
                }
            )
    elif pregnancy.stage == "postpartum" and pregnancy.delivery_date:
        weeks_now = weeks_postpartum(pregnancy) or 0
        for week, title, who in journey.POSTNATAL_CONTACTS:
            out.append(
                {
                    "week": week,
                    "title": title,
                    "who": who,
                    "approx_date": str(pregnancy.delivery_date + timedelta(weeks=week)),
                    "status": "passed" if week < weeks_now else "current" if week == weeks_now else "upcoming",
                }
            )
    return out


def _progress(pregnancy: PregnancyRecord) -> dict:
    if pregnancy.stage == "pregnant":
        week = current_gestational_weeks(pregnancy) or 0
        days_to_due = (pregnancy.due_date - datetime.now(timezone.utc).date()).days if pregnancy.due_date else None
        return {
            "kind": "pregnant",
            "week": week,
            "of": 40,
            "trimester": journey.trimester(week),
            "percent": round(min(week, 40) / 40 * 100),
            "days_to_due": days_to_due,
        }
    weeks = weeks_postpartum(pregnancy) or 0
    return {
        "kind": "postpartum",
        "week": weeks,
        "of": POSTPARTUM_WINDOW_WEEKS,
        "percent": round(min(weeks, POSTPARTUM_WINDOW_WEEKS) / POSTPARTUM_WINDOW_WEEKS * 100),
    }


def _assess(session: Session, mother: User, pregnancy: PregnancyRecord) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=14)
    symptoms = [s for s in get_recent_symptoms(session, str(mother.id), 200) if _aware(s.recorded_at) >= since]
    vitals = [v for v in get_recent_vitals(session, str(mother.id), 200) if _aware(v.recorded_at) >= since]
    result = rules.evaluate(pregnancy.stage, symptoms, vitals)
    stamps = [_aware(x.recorded_at) for x in [*symptoms, *vitals]]
    result["last_logged_at"] = max(stamps).isoformat() if stamps else None
    return result


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@router.get("/home")
async def home(mother: User = Depends(current_mother), session: Session = Depends(get_session)):
    pregnancy = _require_pregnancy(session, mother)
    progress = _progress(pregnancy)
    assessment = _assess(session, mother, pregnancy)
    circle = session.exec(
        select(ConsentGrant).where(ConsentGrant.mother_id == mother.id, ConsentGrant.revoked_at == None)  # noqa: E711
    ).all()
    return {
        "first_name": mother.full_name.split()[0],
        "journey": pregnancy_snapshot(pregnancy),
        "progress": progress,
        "baby_this_week": journey.baby_this_week(progress["week"]) if progress["kind"] == "pregnant" else None,
        "checkups": _checkups(pregnancy),
        "status": {
            "level": assessment["level"],
            "flags": assessment["flags"][:2],
            "last_logged_at": assessment["last_logged_at"],
        },
        "babies": [
            {"id": str(b.id), "name": b.name, "birth_date": str(b.birth_date)} for b in get_babies(session, str(mother.id))
        ],
        "care_circle_count": len(circle),
    }


@router.get("/insights")
async def insights(mother: User = Depends(current_mother), session: Session = Depends(get_session)):
    pregnancy = _require_pregnancy(session, mother)
    assessment = _assess(session, mother, pregnancy)
    return {
        "stage": pregnancy.stage,
        "level": assessment["level"],
        "flags": assessment["flags"],
        "latest": assessment["latest"],
        "last_logged_at": assessment["last_logged_at"],
        "nutrition": [{"label": a, "text": b} for a, b in journey.NUTRITION[pregnancy.stage]],
        "checkups": _checkups(pregnancy),
    }


@router.get("/health/catalog")
async def health_catalog(mother: User = Depends(current_mother), session: Session = Depends(get_session)):
    pregnancy = _require_pregnancy(session, mother)
    return {
        "stage": pregnancy.stage,
        "symptoms": catalog.options_for(pregnancy.stage),
        "vitals": [{"key": k, "label": v[0], "unit": v[1]} for k, v in catalog.VITALS.items()],
    }
