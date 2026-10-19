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


class GymDetailOut(GymOut):
    """GET /gyms/{id} shape - join_code is filled in only for that gym's
    admins, so they can re-share it after creation; null for everyone else."""

    join_code: str | None = None
