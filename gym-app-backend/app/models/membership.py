import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.infra.db.orm import MembershipRole


class MembershipJoinRequest(BaseModel):
    join_code: str


class MembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    gym_id: uuid.UUID
    role: MembershipRole
    joined_at: datetime
