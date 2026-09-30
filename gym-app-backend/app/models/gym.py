import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GymCreate(BaseModel):
    name: str
    city: str
    brand_color: str | None = None


class GymOut(BaseModel):
    """Public shape - deliberately excludes join_code so it can't be looked up
    by anyone who merely knows/guesses a gym's id; it's only handed back once,
    at creation, via GymCreatedOut."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    city: str
    brand_color: str | None
    created_at: datetime


class GymCreatedOut(GymOut):
    join_code: str


class GymPreviewOut(BaseModel):
    """What someone holding a join code may learn about a gym before joining it,
    signed in or not: enough to show "You're joining X" and, once signed in, to
    check existing membership and redirect after joining. The gym's id is a
    UUID primary key, not a capability - every gym-scoped read/write still
    goes through require_membership regardless of who knows it - so unlike
    join_code (the actual secret), there's no reason to withhold it here."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    city: str
    brand_color: str | None


class JoinCodeOut(BaseModel):
    join_code: str
