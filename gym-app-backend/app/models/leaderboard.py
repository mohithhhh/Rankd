import uuid

from pydantic import BaseModel


class GymLeaderboardEntry(BaseModel):
    rank: int
    percentile: float
    user_id: uuid.UUID
    username: str
    bar_total: float


class WeeklyLeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    username: str
    weight_kg: float
    estimated_1rm_kg: float
