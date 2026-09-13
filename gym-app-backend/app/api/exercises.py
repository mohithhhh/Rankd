from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, get_current_user
from app.infra.db.orm import Exercise, MuscleGroup
from app.infra.db.session import get_db
from app.models.exercise import ExerciseOut

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseOut])
def list_exercises(
    muscle_group: MuscleGroup | None = Query(default=None),
    _current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Exercise)
    if muscle_group is not None:
        query = query.filter(Exercise.muscle_group == muscle_group)
    return query.order_by(Exercise.name).all()
