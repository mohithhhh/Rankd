"""_create_one schedules a weekly-bests refresh (as a FastAPI BackgroundTask,
not inline) exactly when a weekly-eligible set is actually created - see
app/api/logged_sets.py and services/weekly_bests.refresh_weekly_bests_in_new_session."""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

from fastapi import BackgroundTasks

from app.api.logged_sets import _create_one
from app.infra.db.orm import Exercise, ExerciseType, MuscleGroup, User
from app.models.logged_set import LoggedSetCreate

USER_ID = uuid.uuid4()
GYM_ID = uuid.uuid4()


def _exercise(weekly_eligible: bool) -> Exercise:
    return Exercise(
        id=uuid.uuid4(), name="Back Squat", type=ExerciseType.weighted,
        muscle_group=MuscleGroup.legs, weight_coefficient=1.5, weekly_eligible=weekly_eligible,
    )


def _user() -> User:
    return User(id=USER_ID, username="u", email="u@example.com", sex="male", bodyweight_kg=80)


def _item(exercise_id: uuid.UUID) -> LoggedSetCreate:
    return LoggedSetCreate(
        gym_id=GYM_ID, exercise_id=exercise_id, weight_kg=100, reps=5,
        client_request_id=uuid.uuid4(),
    )


def _db_for(exercise: Exercise) -> MagicMock:
    db = MagicMock()
    # No existing row with this client_request_id -> proceeds to create.
    db.query.return_value.filter.return_value.first.return_value = None
    db.get.side_effect = lambda model, _id: exercise if model is Exercise else _user()
    db.refresh.side_effect = lambda obj: setattr(obj, "logged_at", datetime.now(timezone.utc))
    return db


def _task_names(tasks: BackgroundTasks) -> list[str]:
    return [t.func.__name__ for t in tasks.tasks]


def test_weekly_eligible_set_schedules_a_refresh(monkeypatch):
    monkeypatch.setattr("app.api.logged_sets.require_membership", lambda *a, **k: None)
    exercise = _exercise(weekly_eligible=True)
    db = _db_for(exercise)
    tasks = BackgroundTasks()

    _create_one(db, USER_ID, _item(exercise.id), tasks)

    assert _task_names(tasks) == ["refresh_weekly_bests_in_new_session"]


def test_non_weekly_eligible_set_schedules_nothing(monkeypatch):
    monkeypatch.setattr("app.api.logged_sets.require_membership", lambda *a, **k: None)
    exercise = _exercise(weekly_eligible=False)
    db = _db_for(exercise)
    tasks = BackgroundTasks()

    _create_one(db, USER_ID, _item(exercise.id), tasks)

    assert _task_names(tasks) == []


def test_idempotent_replay_schedules_nothing(monkeypatch):
    """An existing row means nothing was actually (re-)created - no reason to
    refresh again."""
    monkeypatch.setattr("app.api.logged_sets.require_membership", lambda *a, **k: None)
    exercise = _exercise(weekly_eligible=True)
    db = _db_for(exercise)
    existing = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = existing
    tasks = BackgroundTasks()

    result = _create_one(db, USER_ID, _item(exercise.id), tasks)

    assert result is existing
    assert _task_names(tasks) == []


def test_refresh_task_uses_its_own_session_not_the_requests(monkeypatch):
    """The whole point of the wrapper: BackgroundTasks run after the response
    is sent, by which point the request's `db` may already be closed."""
    from app.services import weekly_bests

    monkeypatch.setattr("app.api.logged_sets.require_membership", lambda *a, **k: None)
    exercise = _exercise(weekly_eligible=True)
    request_db = _db_for(exercise)
    tasks = BackgroundTasks()
    _create_one(request_db, USER_ID, _item(exercise.id), tasks)

    fresh_db = MagicMock()
    fresh_db.query.return_value.join.return_value.filter.return_value.filter.return_value.filter.return_value.all.return_value = []
    monkeypatch.setattr(weekly_bests, "SessionLocal", lambda: fresh_db)

    import asyncio

    asyncio.run(tasks())  # actually runs what FastAPI would run after the response

    fresh_db.close.assert_called_once()
    request_db.close.assert_not_called()
