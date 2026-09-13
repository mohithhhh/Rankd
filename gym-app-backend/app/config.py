from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    database_url: str
    # Optional until Step 2 (JWT verification) is wired up; required in production.
    supabase_jwt_secret: str | None = None
    auth_disabled: bool = False

    @model_validator(mode="after")
    def _auth_disabled_never_in_production(self) -> "Settings":
        if self.auth_disabled and self.env == "production":
            raise ValueError("AUTH_DISABLED must not be true when ENV=production")
        return self


settings = Settings()
