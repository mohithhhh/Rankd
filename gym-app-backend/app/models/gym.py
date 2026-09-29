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
    """What someone holding a join code may learn about a gym before joining it:
    enough to show "You're joining X", nothing that identifies members or the
    gym's id."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    city: str
    brand_color: str | None


class JoinCodeOut(BaseModel):
    join_code: str
