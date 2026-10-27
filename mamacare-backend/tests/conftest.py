import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-test-secret-test-secret-123")
os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.db import get_session
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)

    def override():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override
    yield TestClient(app)  # no `with`: skips lifespan (migrations run against the real DB)
    app.dependency_overrides.clear()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register_mother(client, email="amina@example.com", **extra):
    body = {"full_name": "Amina Wanjiru", "email": email, "password": "Passw0rd!x", "stage": "pregnant", "lmp_date": "2026-07-01"}
    body.update(extra)
    return client.post("/api/auth/register", json=body)
