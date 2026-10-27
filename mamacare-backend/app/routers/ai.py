from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..core.security import current_mother
from ..crud import (
    append_ai_message,
    create_ai_session,
    get_active_pregnancy,
    get_recent_symptoms,
    get_recent_vitals,
    get_ai_session,
    get_ai_sessions,
    get_session_messages,
    update_session_summary,
)
from ..db import get_session
from ..models import User
from ..schemas import AiChatRequest, AiChatResponse
from ..services import insights as rules
from ..services.groq_service import GroqClient, extract_groq_answer
from ..services.context_service import CONTEXT_WINDOW_MESSAGES, build_system_prompt

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat", response_model=AiChatResponse)
async def chat(
    request: AiChatRequest,
    current_user: User = Depends(current_mother),
    session: Session = Depends(get_session),
):
    pregnancy = get_active_pregnancy(session, str(current_user.id))
    symptoms = get_recent_symptoms(session, str(current_user.id))
    vitals = get_recent_vitals(session, str(current_user.id))

    ai_session = None
    if request.session_id:
        ai_session = get_ai_session(session, request.session_id)
        if ai_session and str(ai_session.user_id) != str(current_user.id):
            ai_session = None
    if not ai_session:
        ai_session = create_ai_session(session, user_id=str(current_user.id))

    history = get_session_messages(session, str(ai_session.id), limit=CONTEXT_WINDOW_MESSAGES)
    prompt = build_system_prompt(
        current_user,
        pregnancy,
        recent_vitals=[v.model_dump() for v in vitals],
        recent_symptoms=[s.model_dump() for s in symptoms],
        session_history=[m.model_dump() for m in history],
        session_summary=ai_session.context_summary,
    )
    assessment = rules.evaluate(pregnancy.stage if pregnancy else "pregnant", symptoms, vitals)
    if assessment["level"] == "urgent":
        signs = "; ".join(f["title"] for f in assessment["flags"] if f["level"] == "urgent")
        prompt += (
            f"\nSAFETY: she recently logged warning signs ({signs}). Start your answer by telling her to go to the "
            "nearest health facility now or call 999 or 112. Keep the rest of the answer short.\n"
        )
    prompt += f"\nUser question: {request.question.strip()}\n"

    groq = GroqClient()
    try:
        result = await groq.ask(prompt)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    answer = extract_groq_answer(result)
    if not answer:
        raise HTTPException(status_code=502, detail="Groq returned empty response.")

    append_ai_message(session, str(ai_session.id), "user", request.question)
    append_ai_message(session, str(ai_session.id), "assistant", answer)
    update_session_summary(
        session,
        str(ai_session.id),
        "Summary updates as the conversation grows.",
    )

    return AiChatResponse(answer=answer, session_id=str(ai_session.id))


@router.get("/sessions")
async def list_ai_sessions(
    current_user: User = Depends(current_mother),
    session: Session = Depends(get_session),
):
    sessions = get_ai_sessions(session, str(current_user.id))
    return [{"id": str(s.id), "title": s.title, "last_active_at": s.last_active_at} for s in sessions]


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: str,
    current_user: User = Depends(current_mother),
    session: Session = Depends(get_session),
):
    ai_session = get_ai_session(session, session_id)
    if not ai_session or str(ai_session.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Session not found.")
    messages = get_session_messages(session, session_id)
    
    return [{"role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]
