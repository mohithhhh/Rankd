"""Seed reference data: exercises (Section 6.1) and tier_thresholds (Section 10 - rough placeholder bands).

Idempotent: safe to re-run, skips rows that already exist by natural key.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.infra.db.orm import Exercise, ExerciseType, MuscleGroup, Tier, TierThreshold
from app.infra.db.session import SessionLocal

EXERCISES = [
    # name, type, muscle_group, weight_coefficient, weekly_eligible
    # -- Push (chest / shoulders / triceps) --
    ("Bench Press", ExerciseType.weighted, MuscleGroup.push, 1.3, True),
    ("Incline Bench Press", ExerciseType.weighted, MuscleGroup.push, 1.3, False),
    ("Decline Bench Press", ExerciseType.weighted, MuscleGroup.push, 1.3, False),
    ("Dumbbell Bench Press", ExerciseType.weighted, MuscleGroup.push, 1.3, False),
    ("Overhead Press", ExerciseType.weighted, MuscleGroup.push, 1.3, False),
    ("Shoulder Press", ExerciseType.weighted, MuscleGroup.push, 1.3, False),
    ("Dip", ExerciseType.bodyweight, MuscleGroup.push, 1.2, False),
    ("Push-up", ExerciseType.bodyweight, MuscleGroup.push, 1.2, False),
    ("Pec Deck / Chest Fly", ExerciseType.weighted, MuscleGroup.push, 1.0, False),
    ("Cable Fly", ExerciseType.weighted, MuscleGroup.push, 1.0, False),
    ("Lateral Raise", ExerciseType.weighted, MuscleGroup.push, 1.0, False),
    ("Rear Delt Fly", ExerciseType.weighted, MuscleGroup.push, 1.0, False),
    ("Tricep Pushdown", ExerciseType.weighted, MuscleGroup.push, 1.0, False),
    # -- Pull (back / biceps / rear delts) --
    ("Deadlift", ExerciseType.weighted, MuscleGroup.pull, 1.5, True),
    ("Romanian Deadlift", ExerciseType.weighted, MuscleGroup.pull, 1.5, False),
    ("Barbell Row", ExerciseType.weighted, MuscleGroup.pull, 1.3, False),
    ("Pull-up", ExerciseType.bodyweight, MuscleGroup.pull, 1.2, False),
    ("Lat Pulldown", ExerciseType.weighted, MuscleGroup.pull, 1.3, False),
    ("Close Grip Lat Pulldown", ExerciseType.weighted, MuscleGroup.pull, 1.3, False),
    ("Seated Cable Row", ExerciseType.weighted, MuscleGroup.pull, 1.3, False),
    ("T-Bar Row", ExerciseType.weighted, MuscleGroup.pull, 1.3, False),
    ("Bicep Curl", ExerciseType.weighted, MuscleGroup.pull, 1.0, False),
    ("Hammer Curl", ExerciseType.weighted, MuscleGroup.pull, 1.0, False),
    ("Face Pull", ExerciseType.weighted, MuscleGroup.pull, 1.0, False),
    # -- Legs --
    ("Back Squat", ExerciseType.weighted, MuscleGroup.legs, 1.5, True),
    ("Front Squat", ExerciseType.weighted, MuscleGroup.legs, 1.5, False),
    ("Leg Press", ExerciseType.weighted, MuscleGroup.legs, 1.3, False),
    ("Walking Lunge", ExerciseType.weighted, MuscleGroup.legs, 1.3, False),
    ("Hip Thrust", ExerciseType.weighted, MuscleGroup.legs, 1.3, False),
    ("Leg Extension", ExerciseType.weighted, MuscleGroup.legs, 1.0, False),
    ("Leg Curl", ExerciseType.weighted, MuscleGroup.legs, 1.0, False),
    ("Calf Raise", ExerciseType.weighted, MuscleGroup.legs, 1.0, False),
    # -- Core --
    ("Hanging Leg Raise", ExerciseType.bodyweight, MuscleGroup.core, 1.0, False),
    ("Cable Crunch", ExerciseType.weighted, MuscleGroup.core, 1.0, False),
    ("Weighted Sit-up", ExerciseType.weighted, MuscleGroup.core, 1.0, False),
    # -- Full body --
    ("Power Clean", ExerciseType.weighted, MuscleGroup.full_body, 1.5, False),
    ("Thruster", ExerciseType.weighted, MuscleGroup.full_body, 1.3, False),
    ("Burpee", ExerciseType.bodyweight, MuscleGroup.full_body, 1.2, False),
]

# Rough placeholder point bands (Section 10 open item) - not yet tuned against
# real usage data. 3 sub-levels per tier, descending sub_level toward the tier
# name (Bronze 3 -> Bronze 2 -> Bronze 1 -> Silver 3 -> ...). Olympian is a
# single top-end band with no sub-levels.
TIER_THRESHOLDS = [
    (0, Tier.bronze, 3),
    (3, Tier.bronze, 2),
    (6, Tier.bronze, 1),
    (10, Tier.silver, 3),
    (14, Tier.silver, 2),
    (18, Tier.silver, 1),
    (23, Tier.gold, 3),
    (28, Tier.gold, 2),
    (33, Tier.gold, 1),
    (38, Tier.platinum, 3),
    (44, Tier.platinum, 2),
    (50, Tier.platinum, 1),
    (56, Tier.diamond, 3),
    (63, Tier.diamond, 2),
    (70, Tier.diamond, 1),
    (80, Tier.olympian, 1),
]


def seed_exercises(db):
    existing_names = {name for (name,) in db.query(Exercise.name).all()}
    created = 0
    for name, type_, muscle_group, coefficient, weekly_eligible in EXERCISES:
        if name in existing_names:
            continue
        db.add(
            Exercise(
                name=name,
                type=type_,
                muscle_group=muscle_group,
                weight_coefficient=coefficient,
                weekly_eligible=weekly_eligible,
            )
        )
        created += 1
    db.commit()
    print(f"exercises: {created} created, {len(EXERCISES) - created} already present")


def seed_tier_thresholds(db):
    existing = {(t.tier, t.sub_level) for t in db.query(TierThreshold.tier, TierThreshold.sub_level).all()}
    created = 0
    for min_points, tier, sub_level in TIER_THRESHOLDS:
        if (tier, sub_level) in existing:
            continue
        db.add(TierThreshold(min_points=min_points, tier=tier, sub_level=sub_level))
        created += 1
    db.commit()
    print(f"tier_thresholds: {created} created, {len(TIER_THRESHOLDS) - created} already present")


def main():
    db = SessionLocal()
    try:
        seed_exercises(db)
        seed_tier_thresholds(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
