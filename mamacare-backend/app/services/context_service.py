from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from ..crud import current_gestational_weeks, weeks_postpartum
from ..models import PregnancyRecord, User


CONTEXT_WINDOW_MESSAGES = 20


def normalize_date(value: datetime | str | None) -> str:
    if value is None:
        return "unknown"
    if isinstance(value, datetime):
        return value.date().isoformat()
    return str(value)


def format_recent_vitals(recent_vitals: List[dict]) -> str:
    rows = []
    for vital in recent_vitals:
        text_value = vital.get("value_text") or (
            str(vital.get("value_numeric")) if vital.get("value_numeric") is not None else ""
        )
        unit = vital.get("unit") or ""
        rows.append(
            f"- {vital.get('vital_type', 'vital')}: {text_value} {unit} (recorded {normalize_date(vital.get('recorded_at'))})"
        )
    return "\n".join(rows)


def format_recent_symptoms(recent_symptoms: List[dict]) -> str:
    rows = []
    for symptom in recent_symptoms:
        rows.append(
            f"- {symptom.get('symptom_type', 'symptom')}: {symptom.get('description', '').strip()} (severity {symptom.get('severity', 'n/a')})"
        )
    return "\n".join(rows)


def format_ai_history(messages: List[dict]) -> str:
    if not messages:
        return ""
    lines = ["Conversation history:"]
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "").strip()
        lines.append(f"{role.capitalize()}: {content}")
    return "\n".join(lines)


def journey_lines(pregnancy: Optional[PregnancyRecord]) -> List[str]:
    if pregnancy is None:
        return ["Stage: unknown"]
    if pregnancy.stage == "postpartum":
        return [
            "Stage: postpartum (she has had her baby)",
            f"Weeks since delivery: {weeks_postpartum(pregnancy)}",
            f"Delivery date: {pregnancy.delivery_date}",
        ]
    return [
        "Stage: pregnant",
        f"Pregnancy week: {current_gestational_weeks(pregnancy)}",
        f"Due date: {pregnancy.due_date}",
    ]


def build_system_prompt(
    user: User,
    pregnancy: Optional[PregnancyRecord],
    recent_vitals: List[dict],
    recent_symptoms: List[dict],
    session_history: Optional[List[dict]] = None,
    session_summary: Optional[str] = None,
) -> str:
    parts = [
        "You are Vera, a trusted maternal health assistant for mothers and families in Kenya.",
        "Use simple, warm language. Keep answers short unless more detail is asked.",
        "Never diagnose disease. If symptoms are urgent, recommend immediate medical care.",
        "Provide context-aware answers using the mother's stage (pregnant or postpartum) and recent logs.",
        "If the user has already shared details earlier, weave that into the answer so the conversation feels natural.",
        "",
        f"Patient name: {user.full_name}",
        *journey_lines(pregnancy),
        "",
    ]

    if session_summary:
        parts.append("Long-term context summary:")
        parts.append(session_summary)
        parts.append("")

    if recent_symptoms:
        parts.append("Recent symptoms:")
        parts.append(format_recent_symptoms(recent_symptoms))
        parts.append("")

    if recent_vitals:
        parts.append("Recent vitals:")
        parts.append(format_recent_vitals(recent_vitals))
        parts.append("")

    if session_history:
        parts.append(format_ai_history(session_history))
        parts.append("")

    parts.append("Respond with a concise, friendly answer and include a next step when appropriate.")

    return "\n".join([p for p in parts if p is not None])
