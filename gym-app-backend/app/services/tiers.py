import uuid

from sqlalchemy.orm import Session

from app.infra.db.orm import Exercise, LoggedSet, MuscleGroup, TierThreshold
from app.services.scoring import compute_bar_total


def get_best_points_per_exercise(
    db: Session, user_id: uuid.UUID, gym_id: uuid.UUID | None = None
) -> list[tuple[MuscleGroup, float]]:
    """One (muscle_group, best-ever points) entry per exercise the user has
    logged. If gym_id is given, only lifts logged at that gym count (this is
    what makes gym rank genuinely local, per Section 5's leaderboard formula)
    - otherwise it's the user's global best, used for their personal tier."""
    query = (
        db.query(Exercise.id, Exercise.muscle_group, LoggedSet.points)
        .join(Exercise, Exercise.id == LoggedSet.exercise_id)
        .filter(LoggedSet.user_id == user_id, LoggedSet.points.isnot(None))
    )
    if gym_id is not None:
        query = query.filter(LoggedSet.gym_id == gym_id)

    # Numeric columns come back as Decimal; scoring.py works in plain floats
    # (see project_rankd_scoring_formula_revision memory note).
    best_by_exercise: dict[uuid.UUID, tuple[MuscleGroup, float]] = {}
    for exercise_id, muscle_group, points in query.all():
        points = float(points)
        current = best_by_exercise.get(exercise_id)
        if current is None or points > current[1]:
            best_by_exercise[exercise_id] = (muscle_group, points)

    return list(best_by_exercise.values())


def get_bar_total(db: Session, user_id: uuid.UUID, gym_id: uuid.UUID | None = None) -> float:
    entries = get_best_points_per_exercise(db, user_id, gym_id)
    return compute_bar_total(entries)


def get_tier_for_bar_total(db: Session, bar_total: float) -> TierThreshold | None:
    return (
        db.query(TierThreshold)
        .filter(TierThreshold.min_points <= bar_total)
        .order_by(TierThreshold.min_points.desc())
        .first()
    )
