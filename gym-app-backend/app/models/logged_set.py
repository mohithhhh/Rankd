import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# Sanity ceilings, not scoring rules - well above the heaviest lifts/rep
# counts ever recorded. A logged set can't be edited or deleted yet, and rank
# is driven by best-ever points (scoring.py/compute_bar_total), so one bad
# input (typo, buggy client) would otherwise permanently inflate a tier.
# Mirrors MAX_WEIGHT_KG/MAX_REPS in the frontend's lib/starter-lifts.ts -
# those are client-side hinting only; this is the real, authoritative check.
MAX_LOGGED_WEIGHT_KG = 500
MAX_LOGGED_REPS = 50


class LoggedSetCreate(BaseModel):
    gym_id: uuid.UUID
    exercise_id: uuid.UUID
    weight_kg: float = Field(ge=0, le=MAX_LOGGED_WEIGHT_KG)
    reps: int = Field(gt=0, le=MAX_LOGGED_REPS)
    added_weight_kg: float | None = Field(default=None, ge=0, le=MAX_LOGGED_WEIGHT_KG)
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
