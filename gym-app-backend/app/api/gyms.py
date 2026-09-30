import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, get_current_user, require_platform_admin
from app.config import settings
from app.infra.db.orm import Exercise, Gym, User, WeeklyExerciseBest
from app.infra.db.session import get_db
from app.models.gym import GymCreate, GymCreatedOut, GymOut, GymPreviewOut, JoinCodeOut
from app.models.leaderboard import GymLeaderboardEntry, WeeklyLeaderboardEntry
from app.services.gyms import JoinCodeExhaustedError, normalize_join_code
from app.services.gyms import create_gym as create_gym_record
from app.services.leaderboards import get_gym_leaderboard
from app.services.memberships import require_gym_admin
from app.services.weekly_bests import get_current_week_start

router = APIRouter(prefix="/gyms", tags=["gyms"])


@router.post("", response_model=GymCreatedOut, status_code=status.HTTP_201_CREATED)
def create_gym(
    body: GymCreate,
    current_user: AuthenticatedUser = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    try:
        return create_gym_record(
            db,
            name=body.name,
            city=body.city,
            brand_color=body.brand_color,
            admin_user_id=current_user.id,
        )
    except JoinCodeExhaustedError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate a unique join code, try again",
        ) from exc


@router.get("/by-code/{code}", response_model=GymPreviewOut)
def get_gym_by_code(code: str, db: Session = Depends(get_db)):
    """Preview the gym a join code belongs to (for the "You're joining X" screen
    before/without signing in) - deliberately public, unlike every other gym
    endpoint. A QR scan happens before login, so this can't require a token;
    it only leaks non-sensitive marketing info (name/city/color, not the gym's
    id), same spirit as the public leaderboard page in the plan's Section 9.
    8 chars of A-Z0-9 is ~2.8e12 codes, so brute-forcing one is impractical."""
    gym = db.query(Gym).filter(Gym.join_code == normalize_join_code(code)).first()
    if gym is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid join code")
    return gym


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


@router.get("/{gym_id}/join-code", response_model=JoinCodeOut)
def get_join_code(
    gym_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The gym's join code, for printing its QR poster. Gym admins and platform
    admins only - GymOut deliberately omits it so members can't scrape codes."""
    gym = db.get(Gym, gym_id)
    if gym is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
    if current_user.id not in settings.platform_admin_ids:
        require_gym_admin(db, current_user.id, gym_id)
    return JoinCodeOut(join_code=gym.join_code)


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
