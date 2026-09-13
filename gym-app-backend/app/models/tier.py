from pydantic import BaseModel

from app.infra.db.orm import Tier


class TierOut(BaseModel):
    bar_total: float
    tier: Tier
    sub_level: int
