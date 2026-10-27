from datetime import date, timedelta

from .conftest import auth, register_mother


def token_of(res):
    assert res.status_code in (200, 201), res.text
    return res.json()["access_token"]


# ── Sign-up by stage ─────────────────────────────────────────────────────────

def test_pregnant_registration_returns_role_stage_and_weeks(client):
    data = register_mother(client).json()
    assert data["role"] == "mother" and data["stage"] == "pregnant"
    assert data["gestational_age_weeks"] is not None and data["weeks_postpartum"] is None
    assert data["due_date"]


def test_postpartum_registration_needs_delivery_date_only(client):
    delivered = (date.today() - timedelta(days=15)).isoformat()
    res = register_mother(client, "p@example.com", stage="postpartum", lmp_date=None, delivery_date=delivered)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["stage"] == "postpartum" and data["weeks_postpartum"] == 2
    assert data["gestational_age_weeks"] is None and data["due_date"] is None


def test_registration_validation(client):
    assert register_mother(client, "a@example.com", stage="postpartum", lmp_date=None).status_code == 422
    future = (date.today() + timedelta(days=3)).isoformat()
    assert register_mother(client, "b@example.com", stage="postpartum", lmp_date=None, delivery_date=future).status_code == 422
    assert register_mother(client, "c@example.com", lmp_date=future).status_code == 422
    assert register_mother(client, "d@example.com", stage="twins").status_code == 422
    assert register_mother(client, "e@example.com", password="short").status_code == 422
    assert register_mother(client, "f@example.com", lmp_date=None).status_code == 422


def test_email_is_case_insensitive_and_unique(client):
    register_mother(client, "Amina@Example.com")
    assert register_mother(client, "amina@example.com").status_code == 409
    res = client.post("/api/auth/login", json={"email": "AMINA@example.com", "password": "Passw0rd!x"})
    assert res.status_code == 200


def test_me_and_baby_moves_mother_to_postpartum(client):
    tok = token_of(register_mother(client))
    me = client.get("/api/me", headers=auth(tok)).json()
    assert me["role"] == "mother" and me["pregnancy"]["stage"] == "pregnant" and me["babies"] == []

    born = (date.today() - timedelta(days=4)).isoformat()
    res = client.post("/api/babies", json={"name": "Zuri", "birth_date": born, "sex": "female", "birth_weight_g": 3200}, headers=auth(tok))
    assert res.status_code == 201

    me = client.get("/api/me", headers=auth(tok)).json()
    assert me["pregnancy"]["stage"] == "postpartum" and me["pregnancy"]["delivery_date"] == born
    assert [b["name"] for b in me["babies"]] == ["Zuri"]


# ── Care circle and consent ──────────────────────────────────────────────────

def invite_partner(client, mother_tok, email="juma@example.com", **extra):
    body = {"email": email, "role": "partner", "relationship_label": "Husband"}
    body.update(extra)
    return client.post("/api/care/invites", json=body, headers=auth(mother_tok))


def join_as(client, invite, name="Juma Otieno"):
    return client.post(
        "/api/auth/register",
        json={"full_name": name, "email": invite["email"], "password": "Passw0rd!x", "invite_token": invite["token"]},
    )


def test_full_consent_flow(client):
    mother_tok = token_of(register_mother(client))
    mother_id = client.get("/api/me", headers=auth(mother_tok)).json()["user_id"]
    client.post("/api/health/symptoms", json={"symptom_type": "nausea", "severity": 2}, headers=auth(mother_tok))
    client.post("/api/babies", json={"name": "Zuri", "birth_date": date.today().isoformat()}, headers=auth(mother_tok))

    invite = invite_partner(client, mother_tok).json()
    assert invite["scopes"] == ["journey", "baby"]  # partner default: no symptoms or vitals

    preview = client.get(f"/api/care/invites/by-token/{invite['token']}").json()
    assert preview["mother_name"] == "Amina Wanjiru" and preview["role"] == "partner"

    joined = join_as(client, invite)
    assert joined.status_code == 201 and joined.json()["role"] == "partner"
    partner_tok = joined.json()["access_token"]

    circle = client.get("/api/care/circle", headers=auth(partner_tok)).json()
    assert [c["mother_name"] for c in circle] == ["Amina Wanjiru"]

    # Partner sees only what was shared
    view = client.get(f"/api/care/mothers/{mother_id}/summary", headers=auth(partner_tok)).json()
    assert set(view) >= {"journey", "babies"} and "symptoms" not in view and "vitals" not in view

    # The mother can see that it was read
    log = client.get("/api/care/access-log", headers=auth(mother_tok)).json()
    assert len(log) == 1 and log[0]["viewer_name"] == "Juma Otieno"

    # She widens, then revokes
    grant = client.get("/api/care/grants", headers=auth(mother_tok)).json()[0]
    res = client.patch(f"/api/care/grants/{grant['id']}", json={"scopes": ["journey", "symptoms"]}, headers=auth(mother_tok))
    assert res.status_code == 200
    view = client.get(f"/api/care/mothers/{mother_id}/summary", headers=auth(partner_tok)).json()
    assert len(view["symptoms"]) == 1 and "babies" not in view

    assert client.delete(f"/api/care/grants/{grant['id']}", headers=auth(mother_tok)).status_code == 204
    assert client.get(f"/api/care/mothers/{mother_id}/summary", headers=auth(partner_tok)).status_code == 404
    assert client.get("/api/care/circle", headers=auth(partner_tok)).json() == []


def test_strangers_and_other_roles_cannot_read_a_mother(client):
    a_tok = token_of(register_mother(client, "a@example.com"))
    a_id = client.get("/api/me", headers=auth(a_tok)).json()["user_id"]
    b_tok = token_of(register_mother(client, "b@example.com"))

    assert client.get(f"/api/care/mothers/{a_id}/summary", headers=auth(b_tok)).status_code == 404
    assert client.get(f"/api/care/mothers/{a_id}/summary").status_code in (401, 403)
    # her own view includes everything and is not logged
    own = client.get(f"/api/care/mothers/{a_id}/summary", headers=auth(a_tok)).json()
    assert set(own["scopes"]) == {"journey", "symptoms", "vitals", "baby"}
    assert client.get("/api/care/access-log", headers=auth(a_tok)).json() == []


def test_invitees_cannot_use_mother_only_endpoints(client):
    mother_tok = token_of(register_mother(client))
    invite = invite_partner(client, mother_tok).json()
    partner_tok = join_as(client, invite).json()["access_token"]

    for method, path in [("get", "/api/health/summary"), ("post", "/api/ai/chat"), ("get", "/api/babies"), ("post", "/api/care/invites")]:
        res = getattr(client, method)(path, headers=auth(partner_tok), **({"json": {}} if method == "post" else {}))
        assert res.status_code == 403, path


def test_invite_rules(client):
    mother_tok = token_of(register_mother(client))
    assert invite_partner(client, mother_tok, role="admin").status_code == 422
    assert invite_partner(client, mother_tok, email="amina@example.com").status_code == 422
    assert invite_partner(client, mother_tok, scopes=["everything"]).status_code == 422
    assert invite_partner(client, mother_tok, scopes=[]).status_code == 422

    invite = invite_partner(client, mother_tok).json()
    wrong = client.post("/api/auth/register", json={"full_name": "X", "email": "other@example.com", "password": "Passw0rd!x", "invite_token": invite["token"]})
    assert wrong.status_code == 403

    assert join_as(client, invite).status_code == 201
    assert join_as(client, invite).status_code == 410  # single use


def test_revoked_invite_cannot_be_used(client):
    mother_tok = token_of(register_mother(client))
    invite = invite_partner(client, mother_tok).json()
    assert client.delete(f"/api/care/invites/{invite['id']}", headers=auth(mother_tok)).status_code == 204
    assert client.get(f"/api/care/invites/by-token/{invite['token']}").status_code == 410
    assert join_as(client, invite).status_code == 410
    assert client.get("/api/care/invites", headers=auth(mother_tok)).json() == []


def test_postpartum_mother_can_log_and_share(client):
    delivered = (date.today() - timedelta(days=10)).isoformat()
    tok = token_of(register_mother(client, stage="postpartum", lmp_date=None, delivery_date=delivered))
    assert client.post("/api/health/vitals", json={"vital_type": "temperature", "value_numeric": 36.8, "unit": "C"}, headers=auth(tok)).status_code == 200
    summary = client.get("/api/health/summary", headers=auth(tok)).json()
    assert summary["pregnancy"]["stage"] == "postpartum" and len(summary["vitals"]) == 1
