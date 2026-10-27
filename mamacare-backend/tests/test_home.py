from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

from app.services import insights as rules

from .conftest import auth, register_mother

NOW = datetime(2026, 10, 27, 9, 0, tzinfo=timezone.utc)


def sym(key, hours_ago=1, severity=None):
    return SimpleNamespace(symptom_type=key, severity=severity, recorded_at=NOW - timedelta(hours=hours_ago))


def bp(sys_, dia, hours_ago=1):
    return SimpleNamespace(vital_type="blood_pressure", value_numeric=sys_, value_secondary=dia, unit="mmHg", recorded_at=NOW - timedelta(hours=hours_ago))


def temp(c, hours_ago=1):
    return SimpleNamespace(vital_type="temperature", value_numeric=c, value_secondary=None, unit="°C", recorded_at=NOW - timedelta(hours=hours_ago))


def level(stage="pregnant", symptoms=(), vitals=()):
    return rules.evaluate(stage, symptoms, vitals, now=NOW)["level"]


# ── Rules ────────────────────────────────────────────────────────────────────

def test_no_logs_is_no_data_not_clear():
    assert level() == "no_data"


def test_only_common_symptoms_is_clear():
    assert level(symptoms=[sym("nausea"), sym("feeling_good")]) == "clear"


def test_danger_sign_is_urgent_then_expires():
    assert level(symptoms=[sym("reduced_movement")]) == "urgent"
    # after 3 days it stops shouting but never goes quiet within the week
    assert level(symptoms=[sym("reduced_movement", hours_ago=24 * 5)]) == "check"
    assert level(symptoms=[sym("reduced_movement", hours_ago=24 * 9)]) == "no_data"


def test_watch_symptom_asks_for_a_call():
    assert level(symptoms=[sym("painful_urination", hours_ago=48)]) == "check"


def test_blood_pressure_bands():
    assert level(vitals=[bp(118, 76)]) == "clear"
    assert level(vitals=[bp(142, 88)]) == "check"
    assert level(vitals=[bp(150, 95)]) == "check"
    assert level(vitals=[bp(165, 100)]) == "urgent"
    assert level(vitals=[bp(130, 112)]) == "urgent"


def test_high_bp_with_headache_is_urgent():
    assert level(symptoms=[sym("headache")], vitals=[bp(145, 92)]) == "urgent"


def test_only_latest_blood_pressure_counts():
    old_high = bp(170, 110, hours_ago=30)
    new_normal = bp(118, 76, hours_ago=1)
    assert level(vitals=[old_high, new_normal]) == "clear"


def test_fever_levels():
    assert level(vitals=[temp(38.4)]) == "urgent"
    assert level(vitals=[temp(37.6)]) == "check"
    assert level(vitals=[temp(36.8)]) == "clear"


def test_postpartum_signs():
    assert level("postpartum", symptoms=[sym("thoughts_of_harm")]) == "urgent"
    assert level("postpartum", symptoms=[sym("calf_pain_swelling")]) == "urgent"
    assert level("postpartum", symptoms=[sym("breast_problem")]) == "check"
    # a pregnancy-only sign is not in the postpartum list
    assert level("postpartum", symptoms=[sym("reduced_movement")]) != "urgent"


def test_repeated_strong_common_symptom_asks_for_a_call():
    assert level(symptoms=[sym("back_pain", 2, 5), sym("back_pain", 20, 4)]) == "check"
    assert level(symptoms=[sym("back_pain", 2, 5)]) == "clear"


# ── Endpoints ────────────────────────────────────────────────────────────────

def mother_with_lmp_weeks_ago(client, weeks, email="m@example.com"):
    lmp = (date.today() - timedelta(weeks=weeks, days=1)).isoformat()
    res = register_mother(client, email, lmp_date=lmp)
    return res.json()["access_token"]


def test_home_for_pregnant_mother(client):
    tok = mother_with_lmp_weeks_ago(client, 24)
    home = client.get("/api/home", headers=auth(tok)).json()
    assert home["first_name"] == "Amina"
    assert home["progress"]["kind"] == "pregnant" and home["progress"]["week"] == 24 and home["progress"]["trimester"] == 2
    assert 28 <= home["baby_this_week"]["length_cm"] <= 32
    statuses = {c["week"]: c["status"] for c in home["checkups"]}
    assert statuses[12] == "passed" and statuses[20] == "passed" and statuses[26] == "upcoming"
    assert home["status"]["level"] == "no_data"


def test_home_for_postpartum_mother(client):
    delivered = (date.today() - timedelta(days=15)).isoformat()
    tok = register_mother(client, "p@example.com", stage="postpartum", lmp_date=None, delivery_date=delivered).json()["access_token"]
    home = client.get("/api/home", headers=auth(tok)).json()
    assert home["progress"] == {"kind": "postpartum", "week": 2, "of": 6, "percent": 33}
    assert home["baby_this_week"] is None
    assert [c["week"] for c in home["checkups"]][-1] == 6 and home["checkups"][-1]["status"] == "upcoming"


def test_logging_a_warning_sign_changes_home_and_insights(client):
    tok = mother_with_lmp_weeks_ago(client, 30)
    assert client.post("/api/health/symptoms", json={"symptom_type": "reduced_movement"}, headers=auth(tok)).status_code == 200
    home = client.get("/api/home", headers=auth(tok)).json()
    assert home["status"]["level"] == "urgent" and home["status"]["flags"][0]["title"] == "Baby moving less than usual"
    ins = client.get("/api/insights", headers=auth(tok)).json()
    assert ins["level"] == "urgent" and "999" in ins["flags"][0]["action"] and len(ins["nutrition"]) == 3


def test_logging_validation(client):
    tok = mother_with_lmp_weeks_ago(client, 20)
    h = auth(tok)
    assert client.post("/api/health/symptoms", json={"symptom_type": "made_up"}, headers=h).status_code == 422
    assert client.post("/api/health/symptoms", json={"symptom_type": "nausea", "severity": 9}, headers=h).status_code == 422
    assert client.post("/api/health/vitals", json={"vital_type": "blood_pressure", "value_numeric": 120}, headers=h).status_code == 422
    assert client.post("/api/health/vitals", json={"vital_type": "blood_pressure", "value_numeric": 70, "value_secondary": 120}, headers=h).status_code == 422
    assert client.post("/api/health/vitals", json={"vital_type": "temperature", "value_numeric": 98.6}, headers=h).status_code == 422
    ok = client.post("/api/health/vitals", json={"vital_type": "blood_pressure", "value_numeric": 118, "value_secondary": 76}, headers=h)
    assert ok.status_code == 200 and ok.json()["unit"] == "mmHg"
    cat = client.get("/api/health/catalog", headers=h).json()
    assert cat["stage"] == "pregnant" and any(s["key"] == "heavy_bleeding" and s["level"] == "urgent" for s in cat["symptoms"])


def test_other_roles_cannot_use_mother_screens(client):
    mom = mother_with_lmp_weeks_ago(client, 20)
    invite = client.post("/api/care/invites", json={"email": "j@example.com", "role": "partner"}, headers=auth(mom)).json()
    partner = client.post("/api/auth/register", json={"full_name": "J", "email": "j@example.com", "password": "Passw0rd!x", "invite_token": invite["token"]}).json()["access_token"]
    for path in ("/api/home", "/api/insights", "/api/health/catalog"):
        assert client.get(path, headers=auth(partner)).status_code == 403


def test_vera_is_told_to_send_her_to_care_when_signs_are_logged(client, monkeypatch):
    from app.services import groq_service

    seen = {}

    async def fake_ask(self, prompt, **kw):
        seen["prompt"] = prompt
        return {"output_text": "Please go to the nearest facility now."}

    monkeypatch.setattr(groq_service.GroqClient, "ask", fake_ask)
    tok = mother_with_lmp_weeks_ago(client, 30)
    client.post("/api/health/symptoms", json={"symptom_type": "heavy_bleeding"}, headers=auth(tok))
    res = client.post("/api/ai/chat", json={"question": "what should I do?"}, headers=auth(tok))
    assert res.status_code == 200
    assert "SAFETY" in seen["prompt"] and "Vaginal bleeding" in seen["prompt"]
