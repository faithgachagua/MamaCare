"""Warning-sign checks from what a mother has logged.

These are fixed rules, not a prediction model. They only know what she logged,
so the answer is never "you are fine": the best result is "nothing concerning
in what you logged". Have a clinician review the thresholds before launch.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional

from ..content import symptoms as catalog

URGENT_WINDOW = timedelta(hours=72)
WATCH_WINDOW = timedelta(days=7)
VITAL_WINDOW = timedelta(days=7)

EMERGENCY_ACTION = "Go to the nearest health facility now, or call 999 or 112. Do not wait for it to pass."
SOON_ACTION = "Contact your clinic or a health worker today and tell them what you logged."


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _flag(flag_id: str, level: str, title: str, detail: str, action: str) -> dict:
    return {"id": flag_id, "level": level, "title": title, "detail": detail, "action": action}


def evaluate(stage: str, symptoms: Iterable, vitals: Iterable, now: Optional[datetime] = None) -> dict:
    now = now or datetime.now(timezone.utc)
    symptoms = list(symptoms)
    vitals = list(vitals)
    flags: list[dict] = []
    seen_urgent: set[str] = set()
    seen_watch: set[str] = set()
    urgent_keys_recent: set[str] = set()

    for s in sorted(symptoms, key=lambda x: _aware(x.recorded_at), reverse=True):
        found = catalog.lookup(stage, s.symptom_type)
        if not found:
            continue
        label, level = found
        age = now - _aware(s.recorded_at)
        if level == catalog.URGENT and age <= URGENT_WINDOW and s.symptom_type not in seen_urgent:
            seen_urgent.add(s.symptom_type)
            urgent_keys_recent.add(s.symptom_type)
            flags.append(_flag(f"symptom:{s.symptom_type}", "urgent", label, "You logged this warning sign recently.", EMERGENCY_ACTION))
        elif level == catalog.URGENT and age <= WATCH_WINDOW and s.symptom_type not in seen_watch:
            # A danger sign from the last week never quietly disappears.
            seen_watch.add(s.symptom_type)
            days = max(1, int(age.total_seconds() // 86400))
            flags.append(_flag(f"symptom:{s.symptom_type}", "check", label, f"You logged this warning sign {days} days ago.", "If it is still happening, or nobody has checked you since, go to a health facility today."))
        elif level == catalog.WATCH and age <= WATCH_WINDOW and s.symptom_type not in seen_watch:
            seen_watch.add(s.symptom_type)
            flags.append(_flag(f"symptom:{s.symptom_type}", "check", label, "You logged this in the last 7 days.", SOON_ACTION))

    # Strong symptoms repeated in a short time deserve a call even if they are common ones.
    strong = [s for s in symptoms if (s.severity or 0) >= 4 and now - _aware(s.recorded_at) <= URGENT_WINDOW]
    strong_keys = {s.symptom_type for s in strong}
    for key in strong_keys - seen_urgent - seen_watch:
        found = catalog.lookup(stage, key)
        if found and found[1] is None and sum(1 for s in strong if s.symptom_type == key) >= 2 and key != "feeling_good":
            flags.append(_flag(f"severe:{key}", "check", found[0], "You rated this 4 or 5 out of 5 more than once in 3 days.", SOON_ACTION))

    latest: dict[str, dict] = {}
    for v in sorted(vitals, key=lambda x: _aware(x.recorded_at), reverse=True):
        latest.setdefault(v.vital_type, _vital_view(v))

    bp = next((v for v in sorted(vitals, key=lambda x: _aware(x.recorded_at), reverse=True) if v.vital_type == "blood_pressure"), None)
    if bp and now - _aware(bp.recorded_at) <= VITAL_WINDOW and bp.value_numeric and bp.value_secondary:
        sys_, dia = bp.value_numeric, bp.value_secondary
        reading = f"{sys_:.0f}/{dia:.0f}"
        symptom_with_bp = urgent_keys_recent & {"severe_headache_vision", "face_hand_swelling", "severe_abdominal_pain"}
        recent_headache = any(s.symptom_type in {"headache", "swelling_feet"} and now - _aware(s.recorded_at) <= URGENT_WINDOW for s in symptoms)
        if sys_ >= 160 or dia >= 110:
            flags.append(_flag("bp:severe", "urgent", f"Very high blood pressure ({reading})", "A reading this high can be dangerous in pregnancy and after birth.", EMERGENCY_ACTION))
        elif sys_ >= 140 or dia >= 90:
            if symptom_with_bp or recent_headache:
                flags.append(_flag("bp:high+symptoms", "urgent", f"High blood pressure with symptoms ({reading})", "High blood pressure together with headache, swelling or belly pain needs checking now.", EMERGENCY_ACTION))
            else:
                flags.append(_flag("bp:high", "check", f"High blood pressure ({reading})", "Rest for 15 minutes and measure again. If it is still 140/90 or higher, get it checked.", SOON_ACTION))

    temp = latest.get("temperature")
    if temp and temp["age_hours"] <= 72:
        t = temp["value"]
        if t >= 38.0:
            flags.append(_flag("temp:fever", "urgent", f"Fever ({t:g}°C)", "A temperature of 38°C or higher is a warning sign.", EMERGENCY_ACTION))
        elif t >= 37.5:
            flags.append(_flag("temp:warm", "check", f"Raised temperature ({t:g}°C)", "Measure again in an hour. If it stays above 37.5°C, speak to a health worker.", SOON_ACTION))

    rank = {"urgent": 0, "check": 1}
    flags.sort(key=lambda f: rank[f["level"]])
    logged_recently = any(now - _aware(s.recorded_at) <= WATCH_WINDOW for s in symptoms) or any(
        now - _aware(v.recorded_at) <= VITAL_WINDOW for v in vitals
    )
    level = "urgent" if any(f["level"] == "urgent" for f in flags) else "check" if flags else "clear" if logged_recently else "no_data"
    return {"level": level, "flags": flags, "latest": latest, "logged_recently": logged_recently}


def _vital_view(v) -> dict:
    return {
        "type": v.vital_type,
        "value": v.value_numeric,
        "secondary": v.value_secondary,
        "unit": v.unit,
        "recorded_at": _aware(v.recorded_at).isoformat(),
        "age_hours": (datetime.now(timezone.utc) - _aware(v.recorded_at)).total_seconds() / 3600,
    }
