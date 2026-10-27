"""The care circle: who a mother has chosen to share her information with."""
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..core.roles import (
    ALL_SCOPES,
    DEFAULT_SCOPES,
    INVITE_ROLES,
    SCOPE_BABY,
    SCOPE_JOURNEY,
    SCOPE_SYMPTOMS,
    SCOPE_VITALS,
)
from ..core.security import current_mother, get_current_user
from ..crud import (
    create_grant_from_invite,
    get_active_grant,
    get_active_pregnancy,
    get_babies,
    get_invite_by_token,
    get_recent_symptoms,
    get_recent_vitals,
    invite_is_open,
    log_access,
    pregnancy_snapshot,
)
from ..db import get_session
from ..models import AccessLog, CareInvite, ConsentGrant, User
from ..schemas import CircleEntry, GrantRead, GrantUpdate, InviteCreate, InvitePreview, InviteRead

router = APIRouter(prefix="/api/care", tags=["care"])

INVITE_DAYS = 7


def _clean_scopes(scopes: list[str]) -> list[str]:
    unknown = [s for s in scopes if s not in ALL_SCOPES]
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown scope: {unknown[0]}. Use: {', '.join(ALL_SCOPES)}.")
    cleaned = [s for s in ALL_SCOPES if s in scopes]  # de-duplicated, stable order
    if not cleaned:
        raise HTTPException(status_code=422, detail="Choose at least one thing to share.")
    return cleaned


def _invite_read(i: CareInvite) -> InviteRead:
    return InviteRead(
        id=str(i.id),
        email=i.email,
        role=i.role,
        relationship_label=i.relationship_label,
        scopes=list(i.scopes),
        token=i.token,
        expires_at=i.expires_at,
    )


# ── Invitations (mother) ─────────────────────────────────────────────────────

@router.post("/invites", response_model=InviteRead, status_code=201)
async def create_invite(
    payload: InviteCreate,
    mother: User = Depends(current_mother),
    session: Session = Depends(get_session),
):
    if payload.role not in INVITE_ROLES:
        raise HTTPException(status_code=422, detail=f"role must be one of: {', '.join(INVITE_ROLES)}.")
    email = payload.email.lower()
    if email == mother.email.lower():
        raise HTTPException(status_code=422, detail="You cannot invite yourself.")
    scopes = _clean_scopes(payload.scopes if payload.scopes is not None else list(DEFAULT_SCOPES[payload.role]))

    invite = CareInvite(
        mother_id=mother.id,
        email=email,
        role=payload.role,
        relationship_label=payload.relationship_label,
        scopes=scopes,
        token=secrets.token_urlsafe(24),
        expires_at=datetime.now(timezone.utc) + timedelta(days=INVITE_DAYS),
    )
    session.add(invite)
    session.commit()
    session.refresh(invite)
    return _invite_read(invite)


@router.get("/invites", response_model=list[InviteRead])
async def list_invites(mother: User = Depends(current_mother), session: Session = Depends(get_session)):
    rows = session.exec(select(CareInvite).where(CareInvite.mother_id == mother.id)).all()
    return [_invite_read(i) for i in rows if invite_is_open(i)]


@router.delete("/invites/{invite_id}", status_code=204)
async def revoke_invite(invite_id: UUID, mother: User = Depends(current_mother), session: Session = Depends(get_session)):
    invite = session.get(CareInvite, invite_id)
    if not invite or invite.mother_id != mother.id:
        raise HTTPException(status_code=404, detail="Invitation not found.")
    invite.revoked_at = datetime.now(timezone.utc)
    session.add(invite)
    session.commit()


# ── Invitations (invitee) ────────────────────────────────────────────────────

@router.get("/invites/by-token/{token}", response_model=InvitePreview)
async def preview_invite(token: str, session: Session = Depends(get_session)):
    """Lets the sign-up screen show who invited you and what you will see."""
    invite = get_invite_by_token(session, token)
    if not invite or not invite_is_open(invite):
        raise HTTPException(status_code=410, detail="This invitation is no longer valid.")
    mother = session.get(User, invite.mother_id)
    return InvitePreview(
        mother_name=mother.full_name,
        email=invite.email,
        role=invite.role,
        relationship_label=invite.relationship_label,
        scopes=list(invite.scopes),
    )


@router.post("/invites/by-token/{token}/accept", response_model=CircleEntry)
async def accept_invite(token: str, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """For someone who already has an account with the invited role."""
    invite = get_invite_by_token(session, token)
    if not invite or not invite_is_open(invite):
        raise HTTPException(status_code=410, detail="This invitation is no longer valid.")
    if invite.email.lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="This invitation was sent to a different email address.")
    if user.role != invite.role:
        raise HTTPException(status_code=403, detail=f"This invitation is for a {invite.role} account.")
    grant = create_grant_from_invite(session, invite, user)
    mother = session.get(User, grant.mother_id)
    return CircleEntry(
        mother_id=str(mother.id),
        mother_name=mother.full_name,
        role=grant.role,
        relationship_label=grant.relationship_label,
        scopes=list(grant.scopes),
    )


# ── Grants (mother manages, others see their side) ───────────────────────────

def _grant_read(g: ConsentGrant, grantee: User) -> GrantRead:
    return GrantRead(
        id=str(g.id),
        grantee_id=str(grantee.id),
        grantee_name=grantee.full_name,
        grantee_email=grantee.email,
        role=g.role,
        relationship_label=g.relationship_label,
        scopes=list(g.scopes),
        created_at=g.created_at,
    )


@router.get("/grants", response_model=list[GrantRead])
async def list_grants(mother: User = Depends(current_mother), session: Session = Depends(get_session)):
    grants = session.exec(
        select(ConsentGrant).where(ConsentGrant.mother_id == mother.id, ConsentGrant.revoked_at == None)  # noqa: E711
    ).all()
    return [_grant_read(g, session.get(User, g.grantee_id)) for g in grants]


@router.patch("/grants/{grant_id}", response_model=GrantRead)
async def update_grant(
    grant_id: UUID,
    payload: GrantUpdate,
    mother: User = Depends(current_mother),
    session: Session = Depends(get_session),
):
    grant = session.get(ConsentGrant, grant_id)
    if not grant or grant.mother_id != mother.id or grant.revoked_at is not None:
        raise HTTPException(status_code=404, detail="Access not found.")
    grant.scopes = _clean_scopes(payload.scopes)
    session.add(grant)
    session.commit()
    session.refresh(grant)
    return _grant_read(grant, session.get(User, grant.grantee_id))


@router.delete("/grants/{grant_id}", status_code=204)
async def revoke_grant(grant_id: UUID, mother: User = Depends(current_mother), session: Session = Depends(get_session)):
    grant = session.get(ConsentGrant, grant_id)
    if not grant or grant.mother_id != mother.id or grant.revoked_at is not None:
        raise HTTPException(status_code=404, detail="Access not found.")
    grant.revoked_at = datetime.now(timezone.utc)
    session.add(grant)
    session.commit()


@router.get("/circle", response_model=list[CircleEntry])
async def my_circle(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """The mothers who have chosen to share with me."""
    grants = session.exec(
        select(ConsentGrant).where(ConsentGrant.grantee_id == user.id, ConsentGrant.revoked_at == None)  # noqa: E711
    ).all()
    out = []
    for g in grants:
        mother = session.get(User, g.mother_id)
        out.append(
            CircleEntry(
                mother_id=str(mother.id),
                mother_name=mother.full_name,
                role=g.role,
                relationship_label=g.relationship_label,
                scopes=list(g.scopes),
            )
        )
    return out


@router.get("/mothers/{mother_id}/summary")
async def shared_summary(
    mother_id: UUID,
    viewer: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Only the parts the mother has agreed to share. Every read is logged for her."""
    mother = session.get(User, mother_id)
    if not mother or mother.role != "mother":
        raise HTTPException(status_code=404, detail="Not found.")

    if viewer.id == mother.id:
        scopes = list(ALL_SCOPES)
    else:
        grant = get_active_grant(session, mother.id, viewer.id)
        if not grant:
            # Same answer whether she exists or not, so this cannot be used to look people up.
            raise HTTPException(status_code=404, detail="Not found.")
        scopes = list(grant.scopes)

    data: dict = {"mother_id": str(mother.id), "mother_name": mother.full_name, "scopes": scopes}
    pregnancy = get_active_pregnancy(session, str(mother.id))
    if SCOPE_JOURNEY in scopes:
        data["journey"] = pregnancy_snapshot(pregnancy)
    if SCOPE_SYMPTOMS in scopes:
        data["symptoms"] = [s.model_dump(mode="json") for s in get_recent_symptoms(session, str(mother.id), 10)]
    if SCOPE_VITALS in scopes:
        data["vitals"] = [v.model_dump(mode="json") for v in get_recent_vitals(session, str(mother.id), 10)]
    if SCOPE_BABY in scopes:
        data["babies"] = [
            {"id": str(b.id), "name": b.name, "birth_date": str(b.birth_date), "sex": b.sex}
            for b in get_babies(session, str(mother.id))
        ]

    if viewer.id != mother.id:
        log_access(session, mother.id, viewer.id, scopes)
    return data


@router.get("/access-log")
async def access_log(mother: User = Depends(current_mother), session: Session = Depends(get_session)):
    """Who has looked at my information, and when."""
    rows = session.exec(
        select(AccessLog).where(AccessLog.mother_id == mother.id).order_by(AccessLog.accessed_at.desc()).limit(100)
    ).all()
    out = []
    for r in rows:
        viewer = session.get(User, r.viewer_id)
        out.append(
            {
                "viewer_name": viewer.full_name if viewer else "Removed user",
                "role": viewer.role if viewer else None,
                "scopes": list(r.scopes),
                "accessed_at": r.accessed_at,
            }
        )
    return out
