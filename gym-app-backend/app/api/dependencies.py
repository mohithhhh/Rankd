from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.infra.auth import InvalidTokenError, TokenExpiredError, verify_jwt

bearer_scheme = HTTPBearer(auto_error=False)

# Fixed dev-only user id returned when AUTH_DISABLED=true, so local requests
# have a stable users.id to work with without a real Supabase token.
DEV_USER_ID = UUID("00000000-0000-0000-0000-000000000000")


@dataclass
class AuthenticatedUser:
    id: UUID
    email: str | None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_dev_user_id: str | None = Header(default=None),
) -> AuthenticatedUser:
    if settings.auth_disabled:
        # Dev-only multi-user simulation: pass X-Dev-User-Id to impersonate a
        # different fake user without a real token. Only reachable when
        # AUTH_DISABLED=true, which config.py already hard-fails in production.
        dev_id = UUID(x_dev_user_id) if x_dev_user_id else DEV_USER_ID
        return AuthenticatedUser(id=dev_id, email=f"dev-{dev_id}@example.com")

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token"
        )

    try:
        payload = verify_jwt(credentials.credentials)
    except TokenExpiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        ) from exc
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc

    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing sub claim"
        )

    return AuthenticatedUser(id=UUID(sub), email=payload.get("email"))
