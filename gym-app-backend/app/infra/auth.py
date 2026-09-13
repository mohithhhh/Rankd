from jose import ExpiredSignatureError, JWTError, jwt

from app.config import settings


class InvalidTokenError(Exception):
    pass


class TokenExpiredError(InvalidTokenError):
    """Signature is valid but the token's exp claim has passed.

    Kept distinct from InvalidTokenError (malformed/tampered/wrong-secret)
    because the two call for different client behavior: an expired token
    should trigger a silent refresh via Supabase's refresh token, while any
    other failure means something is actually wrong and should force re-login.
    """


def verify_jwt(token: str) -> dict:
    """Verify a Supabase-issued access token locally using the legacy HS256 secret.

    No network call to Supabase - this is pure signature verification against
    SUPABASE_JWT_SECRET, per the plan's auth design (Section 3). python-jose
    checks the `exp` claim by default, so expiry is already enforced here.
    """
    if not settings.supabase_jwt_secret:
        raise InvalidTokenError("SUPABASE_JWT_SECRET is not configured")

    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except ExpiredSignatureError as exc:
        raise TokenExpiredError(str(exc)) from exc
    except JWTError as exc:
        raise InvalidTokenError(str(exc)) from exc
