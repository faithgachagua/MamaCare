from .conftest import auth, register_mother


def test_update_profile_and_password(client):
    tok = register_mother(client).json()["access_token"]
    h = auth(tok)
    r = client.patch("/api/account", json={"full_name": " Amina W ", "phone": "+254700000000"}, headers=h)
    assert r.status_code == 200 and r.json()["full_name"] == "Amina W"
    assert client.get("/api/account", headers=h).json()["phone"] == "+254700000000"
    assert client.patch("/api/account", json={"full_name": "A"}, headers=h).status_code == 422

    bad = client.post("/api/account/password", json={"current_password": "wrong-pass", "new_password": "NewPassw0rd!"}, headers=h)
    assert bad.status_code == 400
    same = client.post("/api/account/password", json={"current_password": "Passw0rd!x", "new_password": "Passw0rd!x"}, headers=h)
    assert same.status_code == 422
    ok = client.post("/api/account/password", json={"current_password": "Passw0rd!x", "new_password": "NewPassw0rd!"}, headers=h)
    assert ok.status_code == 204
    assert client.post("/api/auth/login", json={"email": "amina@example.com", "password": "NewPassw0rd!"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "amina@example.com", "password": "Passw0rd!x"}).status_code == 401


def test_requires_login(client):
    assert client.get("/api/account").status_code in (401, 403)
