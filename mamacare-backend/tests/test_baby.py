from datetime import date, timedelta

from .conftest import auth, register_mother


def _mother_with_baby(client, days_old=0):
    tok = register_mother(client).json()["access_token"]
    born = (date.today() - timedelta(days=days_old)).isoformat()
    baby = client.post("/api/babies", json={"name": "Zuri", "birth_date": born}, headers=auth(tok)).json()
    return tok, baby


def test_newborn_checklist_statuses(client):
    tok, baby = _mother_with_baby(client, 0)
    r = client.get(f"/api/babies/{baby['id']}/vaccinations", headers=auth(tok)).json()
    st = {i["code"]: i["status"] for i in r["items"]}
    assert st["bcg"] == "due" and st["opv0"] == "due"
    assert st["penta1"] == "later"


def test_old_baby_has_overdue_and_marking_given(client):
    tok, baby = _mother_with_baby(client, 100)  # ~14 weeks
    url = f"/api/babies/{baby['id']}/vaccinations"
    st = {i["code"]: i["status"] for i in client.get(url, headers=auth(tok)).json()["items"]}
    assert st["bcg"] == "overdue" and st["penta1"] == "overdue" and st["penta3"] == "due"
    r = client.put(f"{url}/bcg", json={"given_date": date.today().isoformat()}, headers=auth(tok))
    assert {i["code"]: i["status"] for i in r.json()["items"]}["bcg"] == "given"
    r = client.delete(f"{url}/bcg", headers=auth(tok))
    assert {i["code"]: i["status"] for i in r.json()["items"]}["bcg"] == "overdue"


def test_validation_and_privacy(client):
    tok, baby = _mother_with_baby(client, 10)
    url = f"/api/babies/{baby['id']}/vaccinations"
    future = (date.today() + timedelta(days=1)).isoformat()
    assert client.put(f"{url}/bcg", json={"given_date": future}, headers=auth(tok)).status_code == 422
    assert client.put(f"{url}/bcg", json={"given_date": "2000-01-01"}, headers=auth(tok)).status_code == 422
    assert client.put(f"{url}/nope", json={"given_date": date.today().isoformat()}, headers=auth(tok)).status_code == 404
    other = register_mother(client, email="other@example.com").json()["access_token"]
    assert client.get(url, headers=auth(other)).status_code == 404
    assert client.get(url).status_code in (401, 403)
