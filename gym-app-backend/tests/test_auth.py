import time
import uuid

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.api.dependencies import DEV_USER_ID, get_current_user
from app.config import settings

DUMMY_SECRET = "test-secret-not-the-real-one"


def _bearer(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_valid_token_returns_sub_as_uuid(monkeypatch):
    monkeypatch.setattr(settings, "auth_disabled", False)
    monkeypatch.setattr(settings, "supabase_jwt_secret", DUMMY_SECRET)

    user_id = uuid.uuid4()
    token = jwt.encode(
        {"sub": str(user_id), "aud": "authenticated", "email": "test@example.com"},
        DUMMY_SECRET,
        algorithm="HS256",
    )

    result = get_current_user(_bearer(token))
    assert result.id == user_id
    assert result.email == "test@example.com"


def test_token_signed_with_wrong_secret_is_rejected(monkeypatch):
    monkeypatch.setattr(settings, "auth_disabled", False)
    monkeypatch.setattr(settings, "supabase_jwt_secret", DUMMY_SECRET)

    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "aud": "authenticated"},
        "wrong-secret",
        algorithm="HS256",
    )

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(_bearer(token))
    assert exc_info.value.status_code == 401


def test_missing_credentials_is_rejected(monkeypatch):
    monkeypatch.setattr(settings, "auth_disabled", False)
    monkeypatch.setattr(settings, "supabase_jwt_secret", DUMMY_SECRET)

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(None)
    assert exc_info.value.status_code == 401


def test_auth_disabled_bypasses_verification(monkeypatch):
    monkeypatch.setattr(settings, "auth_disabled", True)

    result = get_current_user(None, x_dev_user_id=None)
    assert result.id == DEV_USER_ID


def test_auth_disabled_honors_dev_user_id_override(monkeypatch):
    monkeypatch.setattr(settings, "auth_disabled", True)

    other_id = uuid.uuid4()
    result = get_current_user(None, x_dev_user_id=str(other_id))
    assert result.id == other_id


def test_expired_token_is_rejected_with_distinct_message(monkeypatch):
    monkeypatch.setattr(settings, "auth_disabled", False)
    monkeypatch.setattr(settings, "supabase_jwt_secret", DUMMY_SECRET)

    token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "aud": "authenticated",
            "exp": int(time.time()) - 60,
        },
        DUMMY_SECRET,
        algorithm="HS256",
    )

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(_bearer(token))
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token expired"
