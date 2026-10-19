"""Seed a populated demo gym for local UI work: ~8 lifters with different
bodyweights and strength levels, a few weeks of history, and this week's
weekly_exercise_bests refreshed.

Sets go through the same write path as the API (`_create_one`), so every
score is real, not hand-typed. Idempotent: fixed UUIDs and client_request_ids,
so re-running replays instead of duplicating. Run scripts/seed.py first.

Users match AUTH_DISABLED's dev emails, so you can sign in as any of them
from the frontend's dev login with the UUID printed at the end. The first
user is the frontend's default dev id (all zeros).
"""

import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.api.logged_sets import _create_one
from app.config import settings
from app.infra.db.orm import Exercise, Gym, Membership, MembershipRole, Sex, User
from app.infra.db.session import SessionLocal
from app.models.logged_set import LoggedSetCreate
from app.services.weekly_bests import refresh_weekly_bests

NAMESPACE = uuid.UUID("5f0c1d1e-7a2b-4c3d-9e8f-000000000d3e")
GYM_ID = uuid.uuid5(NAMESPACE, "gym")
JOIN_CODE = "DEMO2026"

# username, sex, bodyweight_kg, strength multiplier vs. an intermediate baseline
LIFTERS = [
    ("alex.r", Sex.male, 78, 0.9),
    ("maya_lifts", Sex.female, 61, 0.75),
    ("big_dev", Sex.male, 102, 1.25),
    ("arjun.k", Sex.male, 72, 1.05),
    ("priya_pr", Sex.female, 58, 0.85),
    ("coach_sam", Sex.male, 88, 1.45),
    ("noah_squats", Sex.male, 84, 0.65),
    ("lena.b", Sex.female, 67, 1.1),
]

# exercise name -> (baseline weight_kg at multiplier 1.0, reps). For bodyweight
# exercises the weight is added_weight_kg (the API ignores weight_kg there).
BASELINE = {
    "Back Squat": (115, 5),
    "Deadlift": (140, 5),
    "Bench Press": (85, 5),
    "Overhead Press": (52.5, 6),
    "Barbell Row": (75, 8),
    "Pull-up": (10, 6),
    "Dip": (15, 8),
    "Lat Pulldown": (65, 10),
    "Romanian Deadlift": (100, 8),
    "Leg Press": (180, 10),
    "Hip Thrust": (130, 8),
    "Bicep Curl": (32.5, 10),
    "Hanging Leg Raise": (0, 12),
    "Cable Crunch": (45, 12),
    "Power Clean": (75, 3),
}

# Weeks back -> share of the final working weight, so history shows progression.
PROGRESSION = [(3, 0.88), (2, 0.92), (1, 0.96), (0, 1.0)]


def _round_plate(kg: float) -> float:
    return round(kg / 2.5) * 2.5


def main():
    if settings.env == "production":
        raise SystemExit("seed_demo.py refuses to run with ENV=production")

    db = SessionLocal()
    try:
        exercises = {e.name: e for e in db.query(Exercise).all()}
        missing = [name for name in BASELINE if name not in exercises]
        if missing:
            raise SystemExit(f"Run scripts/seed.py first - missing exercises: {missing}")

        gym = db.get(Gym, GYM_ID)
        if gym is None:
            gym = Gym(id=GYM_ID, name="Iron Works", city="Bengaluru", join_code=JOIN_CODE)
            db.add(gym)
            db.commit()

        now = datetime.now(timezone.utc)
        printed = []
        for index, (username, sex, bodyweight, strength) in enumerate(LIFTERS):
            user_id = (
                uuid.UUID(int=0) if index == 0 else uuid.uuid5(NAMESPACE, f"user:{username}")
            )
            if db.get(User, user_id) is None:
                db.add(
                    User(
                        id=user_id,
                        username=username,
                        email=f"dev-{user_id}@example.com",
                        sex=sex,
                        bodyweight_kg=bodyweight,
                    )
                )
                db.commit()

            has_membership = (
                db.query(Membership)
                .filter(Membership.user_id == user_id, Membership.gym_id == GYM_ID)
                .first()
            )
            if has_membership is None:
                role = MembershipRole.admin if index == 0 else MembershipRole.member
                db.add(Membership(user_id=user_id, gym_id=GYM_ID, role=role))
                db.commit()

            # Seeded per user so a re-run picks the same exercises and weights.
            rng = random.Random(username)
            picked = rng.sample(sorted(BASELINE), k=rng.randint(7, len(BASELINE)))
            for name in ("Back Squat", "Bench Press", "Deadlift"):
                if name not in picked:
                    picked.append(name)

            for weeks_back, share in PROGRESSION:
                for name in picked:
                    if weeks_back == 0 and rng.random() < 0.3:
                        continue  # not everyone hits every lift this week
                    exercise = exercises[name]
                    base_kg, reps = BASELINE[name]
                    load = _round_plate(base_kg * strength * share * rng.uniform(0.95, 1.05))
                    is_bodyweight = exercise.type.value == "bodyweight"
                    item = LoggedSetCreate(
                        gym_id=GYM_ID,
                        exercise_id=exercise.id,
                        weight_kg=0 if is_bodyweight else max(load, 2.5),
                        reps=reps,
                        added_weight_kg=load if is_bodyweight else None,
                        client_request_id=uuid.uuid5(
                            NAMESPACE, f"set:{username}:{name}:{weeks_back}"
                        ),
                    )
                    logged = _create_one(db, user_id, item)
                    # This week's sets land a few hours ago; older weeks spread
                    # across that week so history groups into separate days.
                    offset = (
                        timedelta(hours=rng.randint(1, 6))
                        if weeks_back == 0
                        else timedelta(weeks=weeks_back, days=rng.randint(0, 3))
                    )
                    logged.logged_at = now - offset
                db.commit()

            printed.append((username, user_id))

        refreshed = refresh_weekly_bests(db)
        print(f"Demo gym '{gym.name}' (join code {JOIN_CODE}), {refreshed} weekly bests refreshed.")
        for username, user_id in printed:
            print(f"  {username:<12} {user_id}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
