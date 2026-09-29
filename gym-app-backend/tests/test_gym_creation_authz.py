"""POST /gyms is operator-only (PLATFORM_ADMIN_USER_IDS), not open to any signed-in user."""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.dependencies import AuthenticatedUser, get_current_user, require_platform_admin
from app.config import Settings, settings
from app.infra.db.session import get_db
from app.main import app

ADMIN_ID = uuid.uuid4()
OTHER_ID = uuid.uuid4()
BODY = {"name": "Iron Temple", "city": "Pune"}


def _user(user_id: uuid.UUID) -> AuthenticatedUser:
    return AuthenticatedUser(id=user_id, email="x@example.com")


def _fake_db() -> MagicMock:
    """Session stand-in: refresh() fills in the columns Postgres would default."""
    db = MagicMock()

    def refresh(obj):
        obj.id = uuid.uuid4()
        obj.created_at = datetime.now(timezone.utc)

    db.refresh.side_effect = refresh
    return db


@pytest.fixture
def client():
    db = _fake_db()
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app), db
    app.dependency_overrides.clear()


def _act_as(user_id: uuid.UUID):
    app.dependency_overrides[get_current_user] = lambda: _user(user_id)


# --- the gate itself ---------------------------------------------------------

def test_listed_admin_passes_the_gate(monkeypatch):
    monkeypatch.setattr(settings, "platform_admin_user_ids", f"{ADMIN_ID}")
    assert require_platform_admin(_user(ADMIN_ID)).id == ADMIN_ID


def test_unlisted_user_is_forbidden(monkeypatch):
    monkeypatch.setattr(settings, "platform_admin_user_ids", f"{ADMIN_ID}")
    with pytest.raises(HTTPException) as exc:
        require_platform_admin(_user(OTHER_ID))
    assert exc.value.status_code == 403


def test_empty_allowlist_means_nobody_can_create_gyms(monkeypatch):
    monkeypatch.setattr(settings, "platform_admin_user_ids", "")
    with pytest.raises(HTTPException) as exc:
        require_platform_admin(_user(ADMIN_ID))
    assert exc.value.status_code == 403


def test_allowlist_accepts_several_ids_with_whitespace(monkeypatch):
    monkeypatch.setattr(settings, "platform_admin_user_ids", f" {OTHER_ID} , {ADMIN_ID},")
    assert require_platform_admin(_user(OTHER_ID)).id == OTHER_ID
    assert require_platform_admin(_user(ADMIN_ID)).id == ADMIN_ID


def test_malformed_allowlist_fails_at_startup_not_on_first_request():
    with pytest.raises(ValidationError):
        Settings(database_url="postgresql+psycopg://x", platform_admin_user_ids="not-a-uuid")


# --- the real route ----------------------------------------------------------

def test_non_admin_cannot_create_a_gym_and_nothing_is_written(client, monkeypatch):
    test_client, db = client
    monkeypatch.setattr(settings, "platform_admin_user_ids", f"{ADMIN_ID}")
    _act_as(OTHER_ID)

    response = test_client.post("/gyms", json=BODY)

    assert response.status_code == 403
    db.add.assert_not_called()
    db.commit.assert_not_called()


def test_unauthenticated_request_is_401_not_403(client, monkeypatch):
    test_client, _ = client
    monkeypatch.setattr(settings, "auth_disabled", False)
    assert test_client.post("/gyms", json=BODY).status_code == 401


def test_admin_can_create_a_gym_and_is_its_admin_member(client, monkeypatch):
    test_client, db = client
    monkeypatch.setattr(settings, "platform_admin_user_ids", f"{ADMIN_ID}")
    _act_as(ADMIN_ID)

    response = test_client.post("/gyms", json=BODY)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Iron Temple"
    assert len(body["join_code"]) == 8
    db.commit.assert_called_once()
    membership = db.add.call_args_list[-1].args[0]
    assert membership.user_id == ADMIN_ID
    assert membership.role.value == "admin"


def test_other_gym_endpoints_are_still_open_to_ordinary_members(client, monkeypatch):
    """Guard against over-restricting: only creation moved behind the gate."""
    test_client, db = client
    monkeypatch.setattr(settings, "platform_admin_user_ids", f"{ADMIN_ID}")
    _act_as(OTHER_ID)
    db.get.return_value = None  # gym not found -> 404, i.e. the request got past auth

    assert test_client.get(f"/gyms/{uuid.uuid4()}").status_code == 404
