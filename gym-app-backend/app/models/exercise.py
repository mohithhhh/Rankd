import uuid

from pydantic import BaseModel, ConfigDict

from app.infra.db.orm import ExerciseType, MuscleGroup


class ExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: ExerciseType
    muscle_group: MuscleGroup
    weight_coefficient: float
    weekly_eligible: bool
