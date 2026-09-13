import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.infra.db.orm import Sex


class UserCreate(BaseModel):
    username: str
    sex: Sex
    bodyweight_kg: float


class UserUpdate(BaseModel):
    username: str | None = None
    bodyweight_kg: float | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: str
    sex: Sex
    bodyweight_kg: float
    created_at: datetime
