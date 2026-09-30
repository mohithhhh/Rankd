import uuid
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.infra.db.orm import Exercise, LoggedSet, WeeklyExerciseBest
from app.infra.db.session import SessionLocal


def get_current_week_start() -> date:
    today = date.today()
    return today - timedelta(days=today.weekday())  # most recent Monday


def refresh_weekly_bests(db: Session) -> int:
    """Recompute weekly_exercise_bests for the current week, across all gyms.

    Manually-triggerable for now (Step 6), per the plan: prove the query logic
    here before building a real scheduler (APScheduler/cron) around it.
    Only weekly_eligible exercises (SBD) are considered, per Section 5/7.
    """
    week_start = get_current_week_start()
    week_start_dt = datetime.combine(week_start, datetime.min.time())

    rows = (
        db.query(LoggedSet)
        .join(Exercise, Exercise.id == LoggedSet.exercise_id)
        .filter(Exercise.weekly_eligible.is_(True))
        .filter(LoggedSet.logged_at >= week_start_dt)
        .filter(LoggedSet.points.isnot(None))
        .all()
    )

    # Best is by raw weight_kg (bragging-rights framing, not the normalized
    # ratio - Section 7), so pick the row with the heaviest weight_kg per
    # (gym, exercise, user) rather than mixing maxes across different rows.
    best_by_key: dict[tuple[uuid.UUID, uuid.UUID, uuid.UUID], LoggedSet] = {}
    for row in rows:
        key = (row.gym_id, row.exercise_id, row.user_id)
        current_best = best_by_key.get(key)
        if current_best is None or row.weight_kg > current_best.weight_kg:
            best_by_key[key] = row

    for (gym_id, exercise_id, user_id), row in best_by_key.items():
        existing = (
            db.query(WeeklyExerciseBest)
            .filter_by(
                gym_id=gym_id, exercise_id=exercise_id, user_id=user_id, week_start=week_start
            )
            .first()
        )
        if existing is None:
            db.add(
                WeeklyExerciseBest(
                    gym_id=gym_id,
                    exercise_id=exercise_id,
                    user_id=user_id,
                    week_start=week_start,
                    weight_kg=row.weight_kg,
                    estimated_1rm_kg=row.estimated_1rm_kg,
                )
            )
        else:
            existing.weight_kg = row.weight_kg
            existing.estimated_1rm_kg = row.estimated_1rm_kg

    db.commit()
    return len(best_by_key)


def refresh_weekly_bests_in_new_session() -> int:
    """Convenience wrapper for callers with no request-scoped session already
    in hand: the CLI script, and the FastAPI background task fired after
    logging a weekly-eligible set (app/api/logged_sets.py). Opens and closes
    its own session rather than reusing one that may already be closed by
    the time it runs - FastAPI's BackgroundTasks execute after the response
    is sent, which can be after get_db()'s cleanup for that request."""
    db = SessionLocal()
    try:
        return refresh_weekly_bests(db)
    finally:
        db.close()
