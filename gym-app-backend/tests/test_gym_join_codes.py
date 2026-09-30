"""Join-code preview (GET /gyms/by-code), admin-only code retrieval, and the
shared gym-creation service."""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import AuthenticatedUser, get_current_user
from app.config import settings
from app.infra.db.orm import Gym, Membership, MembershipRole
from app.infra.db.session import get_db
from app.main import app
from app.services.gyms import JoinCodeExhaustedError, create_gym, normalize_join_code

USER_ID = uuid.uuid4()
PLATFORM_ADMIN_ID = uuid.uuid4()
GYM_ID = uuid.uuid4()
CODE = "AB12CD34"


def _gym() -> Gym:
    return Gym(
        id=GYM_ID, name="Iron Temple", city="Pune", brand_color="#3d5a80",
        join_code=CODE, created_at=datetime.now(timezone.utc),
    )


def _membership(role: MembershipRole) -> Membership:
    return Membership(user_id=USER_ID, gym_id=GYM_ID, role=role)


@pytest.fixture
def api(monkeypatch):
    db = MagicMock()
    monkeypatch.setattr(settings, "platform_admin_user_ids", str(PLATFORM_ADMIN_ID))
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(USER_ID, "u@example.com")
    yield TestClient(app), db
    app.dependency_overrides.clear()


def _act_as(user_id):
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(user_id, "u@example.com")


# --- normalize ---------------------------------------------------------------

@pytest.mark.parametrize("raw", ["ab12cd34", "  AB12CD34 ", "Ab12Cd34\n"])
def test_normalize_join_code(raw):
    assert normalize_join_code(raw) == CODE


# --- GET /gyms/by-code/{code} --------------------------------------------------

def test_by_code_returns_only_a_public_preview(api):
    client, db = api
    db.query.return_value.filter.return_value.first.return_value = _gym()

    response = client.get(f"/gyms/by-code/{CODE}")

    assert response.status_code == 200
    assert response.json() == {
        "id": str(GYM_ID), "name": "Iron Temple", "city": "Pune", "brand_color": "#3d5a80",
    }


def test_by_code_looks_up_the_normalized_code(api):
    client, db = api
    db.query.return_value.filter.return_value.first.return_value = _gym()

    client.get("/gyms/by-code/ab12cd34")

    criterion = db.query.return_value.filter.call_args.args[0]
    assert criterion.right.value == CODE


def test_by_code_unknown_code_is_404(api):
    client, db = api
    db.query.return_value.filter.return_value.first.return_value = None
    assert client.get("/gyms/by-code/NOPE0000").status_code == 404


def test_by_code_works_without_authentication():
    """Deliberately public - a QR scan happens before login (see the endpoint's
    docstring). No get_current_user override, no Authorization header, and
    auth_disabled is untouched, so a 401 here would mean the route regressed
    back to requiring a token."""
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = _gym()
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = TestClient(app).get(f"/gyms/by-code/{CODE}")
        assert response.status_code == 200
        assert response.json()["id"] == str(GYM_ID)
        assert response.json()["name"] == "Iron Temple"
    finally:
        app.dependency_overrides.clear()


def test_by_code_is_not_shadowed_by_the_gym_id_route(api):
    """/gyms/by-code/X must reach the preview, not be parsed as /gyms/{gym_id}."""
    client, db = api
    db.query.return_value.filter.return_value.first.return_value = _gym()
    response = client.get(f"/gyms/by-code/{CODE}")
    assert response.status_code == 200
    assert response.json()["id"] == str(GYM_ID)


# --- POST /memberships/join uses the same normalization -----------------------------

def test_join_accepts_a_lowercase_code(api):
    client, db = api
    db.query.return_value.filter.return_value.first.side_effect = [_gym(), None]
    db.refresh.side_effect = lambda m: (
        setattr(m, "id", uuid.uuid4()),
        setattr(m, "joined_at", datetime.now(timezone.utc)),
    )

    response = client.post("/memberships/join", json={"join_code": " ab12cd34 "})

    assert response.status_code == 201
    first_criterion = db.query.return_value.filter.call_args_list[0].args[0]
    assert first_criterion.right.value == CODE


# --- GET /gyms/{id}/join-code -----------------------------------------------------

def test_gym_admin_can_read_the_join_code(api):
    client, db = api
    db.get.return_value = _gym()
    db.query.return_value.filter.return_value.first.return_value = _membership(MembershipRole.admin)

    response = client.get(f"/gyms/{GYM_ID}/join-code")

    assert response.status_code == 200
    assert response.json() == {"join_code": CODE}


def test_ordinary_member_cannot_read_the_join_code(api):
    client, db = api
    db.get.return_value = _gym()
    db.query.return_value.filter.return_value.first.return_value = _membership(MembershipRole.member)

    response = client.get(f"/gyms/{GYM_ID}/join-code")

    assert response.status_code == 403
    assert CODE not in response.text


def test_non_member_cannot_read_the_join_code(api):
    client, db = api
    db.get.return_value = _gym()
    db.query.return_value.filter.return_value.first.return_value = None

    response = client.get(f"/gyms/{GYM_ID}/join-code")

    assert response.status_code == 403
    assert CODE not in response.text


def test_platform_admin_can_read_any_gyms_join_code_without_membership(api):
    client, db = api
    _act_as(PLATFORM_ADMIN_ID)
    db.get.return_value = _gym()
    db.query.return_value.filter.return_value.first.return_value = None

    response = client.get(f"/gyms/{GYM_ID}/join-code")

    assert response.status_code == 200
    assert response.json() == {"join_code": CODE}


def test_join_code_for_unknown_gym_is_404(api):
    client, db = api
    db.get.return_value = None
    assert client.get(f"/gyms/{GYM_ID}/join-code").status_code == 404


def test_gym_out_still_never_exposes_the_join_code(api):
    client, db = api
    db.get.return_value = _gym()
    response = client.get(f"/gyms/{GYM_ID}")
    assert response.status_code == 200
    assert "join_code" not in response.json()


# --- services.gyms.create_gym ---------------------------------------------------------

def _db_that_assigns_ids(flush_side_effect=None):
    db = MagicMock()
    db.flush.side_effect = flush_side_effect
    db.refresh.side_effect = lambda gym: setattr(gym, "id", uuid.uuid4())
    return db


def test_create_gym_without_admin_adds_no_membership():
    db = _db_that_assigns_ids()
    gym = create_gym(db, name="A", city="B")
    assert len(gym.join_code) == 8 and gym.join_code == gym.join_code.upper()
    assert [type(c.args[0]) for c in db.add.call_args_list] == [Gym]


def test_create_gym_with_admin_makes_them_gym_admin():
    db = _db_that_assigns_ids()
    create_gym(db, name="A", city="B", admin_user_id=USER_ID)
    membership = db.add.call_args_list[-1].args[0]
    assert (membership.user_id, membership.role) == (USER_ID, MembershipRole.admin)


def test_create_gym_retries_on_join_code_collision():
    db = _db_that_assigns_ids(flush_side_effect=[IntegrityError("x", {}, Exception()), None])
    gym = create_gym(db, name="A", city="B")
    assert gym is not None
    db.rollback.assert_called_once()
    db.commit.assert_called_once()


def test_create_gym_gives_up_after_repeated_collisions():
    db = _db_that_assigns_ids(flush_side_effect=IntegrityError("x", {}, Exception()))
    with pytest.raises(JoinCodeExhaustedError):
        create_gym(db, name="A", city="B")
    db.commit.assert_not_called()
