from uuid import UUID

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    database_url: str
    # Project URL (https://<project-ref>.supabase.co) - where the JWKS public
    # keys for verifying asymmetric (ES256/RS256) access tokens are fetched from.
    supabase_url: str | None = None
    # Legacy HS256 shared secret. Only needed to accept tokens signed before the
    # project rotated to asymmetric signing keys; leave unset once it's revoked.
    supabase_jwt_secret: str | None = None
    auth_disabled: bool = False
    # Comma-separated Supabase user ids (users.id) allowed to create gyms.
    # Kept as a plain string, not list[UUID], because pydantic-settings would
    # otherwise demand JSON syntax for it in an env var. Empty = nobody can.
    platform_admin_user_ids: str = ""

    @property
    def platform_admin_ids(self) -> frozenset[UUID]:
        return frozenset(
            UUID(part.strip()) for part in self.platform_admin_user_ids.split(",") if part.strip()
        )

    @model_validator(mode="after")
    def _auth_disabled_never_in_production(self) -> "Settings":
        if self.auth_disabled and self.env == "production":
            raise ValueError("AUTH_DISABLED must not be true when ENV=production")
        # Fail at startup on a malformed id, not on the first gym-creation request.
        self.platform_admin_ids
        return self


settings = Settings()
