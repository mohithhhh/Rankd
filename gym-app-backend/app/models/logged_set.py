import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LoggedSetCreate(BaseModel):
    gym_id: uuid.UUID
    exercise_id: uuid.UUID
    weight_kg: float = Field(ge=0)
    reps: int = Field(gt=0)
    added_weight_kg: float | None = Field(default=None, ge=0)
    client_request_id: uuid.UUID


class LoggedSetBulkCreate(BaseModel):
    items: list[LoggedSetCreate]


class LoggedSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    gym_id: uuid.UUID
    exercise_id: uuid.UUID
    weight_kg: float
    reps: int
    added_weight_kg: float | None
    bodyweight_at_log_kg: float
    # Null until Step 5 wires services/scoring.py into the write path.
    estimated_1rm_kg: float | None
    relative_ratio: float | None
    points: float | None
    verified: bool
    logged_at: datetime
    client_request_id: uuid.UUID
