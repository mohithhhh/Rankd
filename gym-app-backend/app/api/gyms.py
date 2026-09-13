import secrets
import string
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, get_current_user
from app.infra.db.orm import Exercise, Gym, Membership, MembershipRole, User, WeeklyExerciseBest
from app.infra.db.session import get_db
from app.models.gym import GymCreate, GymCreatedOut, GymOut
from app.models.leaderboard import GymLeaderboardEntry, WeeklyLeaderboardEntry
from app.services.leaderboards import get_gym_leaderboard
from app.services.weekly_bests import get_current_week_start

router = APIRouter(prefix="/gyms", tags=["gyms"])

_JOIN_CODE_ALPHABET = string.ascii_uppercase + string.digits
_JOIN_CODE_LENGTH = 8
_MAX_JOIN_CODE_ATTEMPTS = 5


def _generate_join_code() -> str:
    return "".join(secrets.choice(_JOIN_CODE_ALPHABET) for _ in range(_JOIN_CODE_LENGTH))


@router.post("", response_model=GymCreatedOut, status_code=status.HTTP_201_CREATED)
def create_gym(
    body: GymCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for _ in range(_MAX_JOIN_CODE_ATTEMPTS):
        gym = Gym(
            name=body.name,
            city=body.city,
            brand_color=body.brand_color,
            join_code=_generate_join_code(),
        )
        db.add(gym)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            continue

        db.add(Membership(user_id=current_user.id, gym_id=gym.id, role=MembershipRole.admin))
        db.commit()
        db.refresh(gym)
        return gym

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Could not generate a unique join code, try again",
    )


@router.get("/{gym_id}", response_model=GymOut)
def get_gym(
    gym_id: uuid.UUID,
    _current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    gym = db.get(Gym, gym_id)
    if gym is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
    return gym


@router.get("/{gym_id}/leaderboard", response_model=list[GymLeaderboardEntry])
def get_leaderboard(
    gym_id: uuid.UUID,
    _current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.get(Gym, gym_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
    return get_gym_leaderboard(db, gym_id)


@router.get(
    "/{gym_id}/exercises/{exercise_id}/weekly-leaderboard",
    response_model=list[WeeklyLeaderboardEntry],
)
def get_weekly_leaderboard(
    gym_id: uuid.UUID,
    exercise_id: uuid.UUID,
    _current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.get(Gym, gym_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
    if db.get(Exercise, exercise_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    week_start = get_current_week_start()
    rows = (
        db.query(WeeklyExerciseBest)
        .filter(
            WeeklyExerciseBest.gym_id == gym_id,
            WeeklyExerciseBest.exercise_id == exercise_id,
            WeeklyExerciseBest.week_start == week_start,
        )
        .order_by(WeeklyExerciseBest.weight_kg.desc())
        .all()
    )

    entries = []
    for rank, row in enumerate(rows, start=1):
        user = db.get(User, row.user_id)
        entries.append(
            WeeklyLeaderboardEntry(
                rank=rank,
                user_id=row.user_id,
                username=user.username,
                weight_kg=float(row.weight_kg),
                estimated_1rm_kg=float(row.estimated_1rm_kg),
            )
        )
    return entries
