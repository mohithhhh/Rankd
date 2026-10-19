from pydantic import BaseModel, ConfigDict

from app.infra.db.orm import Tier


class TierOut(BaseModel):
    bar_total: float
    tier: Tier
    sub_level: int


class TierThresholdOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    min_points: int
    tier: Tier
    sub_level: int
