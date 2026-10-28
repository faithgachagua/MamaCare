from datetime import date, timedelta
from typing import Optional

from ..content.vaccines import GRACE_WEEKS, SCHEDULE, SOON_WEEKS


def build_checklist(birth_date: date, given: dict[str, date], today: Optional[date] = None) -> list[dict]:
    """Every scheduled dose with a status: given, overdue, due, soon or later."""
    today = today or date.today()
    out = []
    for code, name, protects, week in SCHEDULE:
        due = birth_date + timedelta(weeks=week)
        if code in given:
            status = "given"
        elif today > due + timedelta(weeks=GRACE_WEEKS):
            status = "overdue"
        elif today >= due:
            status = "due"
        elif today >= due - timedelta(weeks=SOON_WEEKS):
            status = "soon"
        else:
            status = "later"
        out.append(
            {
                "code": code,
                "name": name,
                "protects_against": protects,
                "due_date": due,
                "age_weeks": week,
                "status": status,
                "given_date": given.get(code),
            }
        )
    return out
