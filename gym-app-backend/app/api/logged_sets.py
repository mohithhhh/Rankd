import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, get_current_user
from app.infra.db.orm import Exercise, LoggedSet, User
from app.infra.db.session import get_db
from app.models.logged_set import LoggedSetBulkCreate, LoggedSetCreate, LoggedSetOut
from app.services.memberships import require_membership
from app.services.scoring import score_logged_set

router = APIRouter(prefix="/logged-sets", tags=["logged-sets"])


def _create_one(db: Session, user_id: uuid.UUID, item: LoggedSetCreate) -> LoggedSet:
    # Idempotent replay: a retried request from a flaky connection returns the
    # already-created row instead of erroring or duplicating it.
    existing = (
        db.query(LoggedSet).filter(LoggedSet.client_request_id == item.client_request_id).first()
    )
    if existing is not None:
        return existing

    require_membership(db, user_id, item.gym_id)

    exercise = db.get(Exercise, item.exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your profile before logging sets",
        )

    # Numeric columns come back as Decimal via psycopg; scoring.py works in
    # plain floats, so convert at this ORM/scoring boundary.
    score = score_logged_set(
        exercise_type=exercise.type,
        weight_coefficient=float(exercise.weight_coefficient),
        weight_kg=item.weight_kg,
        reps=item.reps,
        bodyweight_kg=float(user.bodyweight_kg),
        added_weight_kg=item.added_weight_kg,
    )

    logged_set = LoggedSet(
        user_id=user_id,
        gym_id=item.gym_id,
        exercise_id=item.exercise_id,
        weight_kg=item.weight_kg,
        reps=item.reps,
        added_weight_kg=item.added_weight_kg,
        # Snapshotted now, not looked up live later, so a future bodyweight
        # change doesn't retroactively rescore this historical lift.
        bodyweight_at_log_kg=user.bodyweight_kg,
        estimated_1rm_kg=score.estimated_1rm_kg,
        relative_ratio=score.relative_ratio,
        points=score.points,
        client_request_id=item.client_request_id,
    )
    db.add(logged_set)
    db.commit()
    db.refresh(logged_set)
    return logged_set


@router.post("", response_model=LoggedSetOut, status_code=status.HTTP_201_CREATED)
def create_logged_set(
    body: LoggedSetCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _create_one(db, current_user.id, body)


@router.post("/bulk", response_model=list[LoggedSetOut], status_code=status.HTTP_201_CREATED)
def create_logged_sets_bulk(
    body: LoggedSetBulkCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [_create_one(db, current_user.id, item) for item in body.items]


@router.get("/me", response_model=list[LoggedSetOut])
def list_my_logged_sets(
    gym_id: uuid.UUID | None = Query(default=None),
    exercise_id: uuid.UUID | None = Query(default=None),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(LoggedSet).filter(LoggedSet.user_id == current_user.id)
    if gym_id is not None:
        query = query.filter(LoggedSet.gym_id == gym_id)
    if exercise_id is not None:
        query = query.filter(LoggedSet.exercise_id == exercise_id)
    return query.order_by(LoggedSet.logged_at.desc()).all()
