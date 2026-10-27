"""Roles and data-sharing scopes for MamaCare."""

ROLE_MOTHER = "mother"
ROLE_PARTNER = "partner"
ROLE_FAMILY = "family"
ROLE_DOCTOR = "doctor"
ROLE_ADMIN = "admin"

ALL_ROLES = (ROLE_MOTHER, ROLE_PARTNER, ROLE_FAMILY, ROLE_DOCTOR, ROLE_ADMIN)

# Roles a mother can invite into her care circle. Mothers sign up publicly;
# admins are created out of band.
INVITE_ROLES = (ROLE_PARTNER, ROLE_FAMILY, ROLE_DOCTOR)

# What a mother can share. Nothing is shared unless a scope is granted.
SCOPE_JOURNEY = "journey"      # stage, week, due date
SCOPE_SYMPTOMS = "symptoms"
SCOPE_VITALS = "vitals"
SCOPE_BABY = "baby"
ALL_SCOPES = (SCOPE_JOURNEY, SCOPE_SYMPTOMS, SCOPE_VITALS, SCOPE_BABY)

# Starting suggestion shown to the mother; she can change it per invite.
DEFAULT_SCOPES = {
    ROLE_PARTNER: (SCOPE_JOURNEY, SCOPE_BABY),
    ROLE_FAMILY: (SCOPE_JOURNEY,),
    ROLE_DOCTOR: ALL_SCOPES,
}

STAGE_PREGNANT = "pregnant"
STAGE_POSTPARTUM = "postpartum"
STAGES = (STAGE_PREGNANT, STAGE_POSTPARTUM)
