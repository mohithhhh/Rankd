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


# --- ES256 / JWKS (Supabase asymmetric signing keys) ---------------------------

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from jose import jwk

from app.infra import auth as auth_module


def _make_es256_keypair(kid: str) -> tuple[str, dict]:
    """Returns (private PEM for signing, public JWK as Supabase's JWKS serves it)."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    public_pem = private_key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()
    public_jwk = {**jwk.construct(public_pem, "ES256").to_dict(), "kid": kid, "alg": "ES256"}
    return private_pem, public_jwk


def _use_jwks(monkeypatch, *public_jwks: dict) -> list[int]:
    """Serve the given public keys as the project's JWKS. Returns a list whose
    length is the number of times the (fake) network fetch was made."""
    monkeypatch.setattr(settings, "auth_disabled", False)
    monkeypatch.setattr(settings, "supabase_url", "https://example.supabase.co")
    auth_module._reset_jwks_cache()
    fetches: list[int] = []

    def fake_fetch():
        fetches.append(1)
        return {k["kid"]: k for k in public_jwks}

    monkeypatch.setattr(auth_module, "_fetch_jwks", fake_fetch)
    return fetches


def _es256_token(private_pem: str, kid: str | None, **claims) -> str:
    payload = {"sub": str(uuid.uuid4()), "aud": "authenticated", **claims}
    headers = {"kid": kid} if kid else {}
    return jwt.encode(payload, private_pem, algorithm="ES256", headers=headers)


def test_es256_token_verified_against_jwks(monkeypatch):
    private_pem, public_jwk = _make_es256_keypair("key-1")
    _use_jwks(monkeypatch, public_jwk)

    user_id = uuid.uuid4()
    token = _es256_token(private_pem, "key-1", sub=str(user_id), email="g@example.com")

    result = get_current_user(_bearer(token))
    assert result.id == user_id
    assert result.email == "g@example.com"


def test_es256_token_signed_by_a_different_key_is_rejected(monkeypatch):
    _, published_jwk = _make_es256_keypair("key-1")
    attacker_pem, _ = _make_es256_keypair("key-1")  # same kid, different key
    _use_jwks(monkeypatch, published_jwk)

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(_bearer(_es256_token(attacker_pem, "key-1")))
    assert exc_info.value.status_code == 401


def test_es256_token_with_unknown_kid_is_rejected(monkeypatch):
    private_pem, public_jwk = _make_es256_keypair("key-1")
    _use_jwks(monkeypatch, public_jwk)

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(_bearer(_es256_token(private_pem, "some-other-kid")))
    assert exc_info.value.status_code == 401


def test_es256_token_without_kid_is_rejected(monkeypatch):
    private_pem, public_jwk = _make_es256_keypair("key-1")
    _use_jwks(monkeypatch, public_jwk)

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(_bearer(_es256_token(private_pem, None)))
    assert exc_info.value.status_code == 401


def test_expired_es256_token_is_rejected_with_distinct_message(monkeypatch):
    private_pem, public_jwk = _make_es256_keypair("key-1")
    _use_jwks(monkeypatch, public_jwk)

    token = _es256_token(private_pem, "key-1", exp=int(time.time()) - 60)
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(_bearer(token))
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token expired"


def test_jwks_is_cached_across_requests(monkeypatch):
    private_pem, public_jwk = _make_es256_keypair("key-1")
    fetches = _use_jwks(monkeypatch, public_jwk)

    for _ in range(3):
        get_current_user(_bearer(_es256_token(private_pem, "key-1")))
    assert len(fetches) == 1


def test_unknown_kids_cannot_force_repeated_jwks_fetches(monkeypatch):
    private_pem, public_jwk = _make_es256_keypair("key-1")
    fetches = _use_jwks(monkeypatch, public_jwk)

    for _ in range(5):
        with pytest.raises(HTTPException):
            get_current_user(_bearer(_es256_token(private_pem, "bogus")))
    assert len(fetches) == 1


def test_alg_none_token_is_rejected(monkeypatch):
    _use_jwks(monkeypatch)
    # Unsigned token: header {"alg":"none"}, payload {"sub":...}, empty signature.
    import base64
    import json

    def b64(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()

    token = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'sub': str(uuid.uuid4()), 'aud': 'authenticated'})}."
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(_bearer(token))
    assert exc_info.value.status_code == 401


def test_hs256_token_rejected_when_no_legacy_secret_is_configured(monkeypatch):
    monkeypatch.setattr(settings, "auth_disabled", False)
    monkeypatch.setattr(settings, "supabase_jwt_secret", None)

    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "aud": "authenticated"}, DUMMY_SECRET, algorithm="HS256"
    )
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(_bearer(token))
    assert exc_info.value.status_code == 401


def test_garbage_token_is_rejected(monkeypatch):
    monkeypatch.setattr(settings, "auth_disabled", False)
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(_bearer("not-a-jwt"))
    assert exc_info.value.status_code == 401
