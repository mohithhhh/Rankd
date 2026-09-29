import time

import httpx
from jose import ExpiredSignatureError, JWTError, jwt

from app.config import settings

# Supabase projects on asymmetric JWT signing keys issue ES256 (or RS256)
# access tokens, verified against the project's public JWKS. HS256 is the
# legacy shared-secret scheme and is only accepted while a secret is configured.
_JWKS_ALGORITHMS = {"ES256", "RS256"}
_JWKS_TTL_SECONDS = 600
# Floor between refetch attempts, so a flood of tokens with unknown `kid`s
# can't turn into a flood of outbound requests to Supabase.
_JWKS_MIN_REFETCH_SECONDS = 30

_jwks_keys: dict[str, dict] = {}
_jwks_fetched_at: float | None = None
_jwks_last_attempt: float | None = None


class InvalidTokenError(Exception):
    pass


class TokenExpiredError(InvalidTokenError):
    """Signature is valid but the token's exp claim has passed.

    Kept distinct from InvalidTokenError (malformed/tampered/wrong-secret)
    because the two call for different client behavior: an expired token
    should trigger a silent refresh via Supabase's refresh token, while any
    other failure means something is actually wrong and should force re-login.
    """


def _reset_jwks_cache() -> None:
    global _jwks_keys, _jwks_fetched_at, _jwks_last_attempt
    _jwks_keys, _jwks_fetched_at, _jwks_last_attempt = {}, None, None


def _fetch_jwks() -> dict[str, dict]:
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    response = httpx.get(url, timeout=5.0)
    response.raise_for_status()
    return {key["kid"]: key for key in response.json().get("keys", []) if "kid" in key}


def _get_jwks_key(kid: str) -> dict:
    global _jwks_keys, _jwks_fetched_at, _jwks_last_attempt

    if not settings.supabase_url:
        raise InvalidTokenError("SUPABASE_URL is not configured")

    now = time.monotonic()
    key = _jwks_keys.get(kid)
    age = float("inf") if _jwks_fetched_at is None else now - _jwks_fetched_at
    if key is not None and age < _JWKS_TTL_SECONDS:
        return key

    # Cache miss (first request, or an unknown kid after a key rotation) or a
    # stale cache: refetch, subject to the floor above.
    since_attempt = float("inf") if _jwks_last_attempt is None else now - _jwks_last_attempt
    if since_attempt >= _JWKS_MIN_REFETCH_SECONDS:
        _jwks_last_attempt = now
        try:
            _jwks_keys = _fetch_jwks()
            _jwks_fetched_at = now
        except (httpx.HTTPError, ValueError) as exc:
            if key is None:
                raise InvalidTokenError("Could not fetch Supabase signing keys") from exc
            # Supabase briefly unreachable: keep serving with the stale key.
            return key

    key = _jwks_keys.get(kid)
    if key is None:
        raise InvalidTokenError("Unknown signing key id")
    return key


def verify_jwt(token: str) -> dict:
    """Verify a Supabase-issued access token locally - no per-request call to
    Supabase (the JWKS is cached), per the plan's auth design (Section 3).

    The verification key and the permitted algorithm are chosen from the
    token's (unverified) header, but each path only ever accepts its own
    algorithm with its own key, so a token can't downgrade itself - e.g. an
    HS256 token is never checked against a public key. python-jose checks
    `exp` by default, so expiry is enforced here.
    """
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise InvalidTokenError(str(exc)) from exc

    alg = header.get("alg")
    if alg == "HS256":
        if not settings.supabase_jwt_secret:
            raise InvalidTokenError("SUPABASE_JWT_SECRET is not configured")
        key: str | dict = settings.supabase_jwt_secret
    elif alg in _JWKS_ALGORITHMS:
        kid = header.get("kid")
        if not kid:
            raise InvalidTokenError("Token header has no kid")
        key = _get_jwks_key(kid)
    else:
        raise InvalidTokenError(f"Unsupported token algorithm: {alg}")

    try:
        return jwt.decode(token, key, algorithms=[alg], audience="authenticated")
    except ExpiredSignatureError as exc:
        raise TokenExpiredError(str(exc)) from exc
    except JWTError as exc:
        raise InvalidTokenError(str(exc)) from exc
