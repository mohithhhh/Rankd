"""Pure scoring functions - no FastAPI, no DB session. See RankD_plan.md Section 6.

Deliberately isolated and unit-tested here: a silent bug in this module would
corrupt every tier and leaderboard downstream, since bar_total is always
computed fresh from logged_sets at read time rather than cached.
"""

from dataclasses import dataclass

from app.infra.db.orm import ExerciseType, MuscleGroup

# Epley's 1RM estimate becomes unreliable much above ~10-12 reps; the plan
# caps the *estimation formula's* rep count here, while the raw reps a user
# actually performed still get stored as-is in logged_sets for history.
EPLEY_REP_CAP = 12

# Allometric scaling exponent (Section 6.2) - applied identically to weighted
# and bodyweight exercises (see RankD_plan.md for why bodyweight exercises no
# longer use a separate bodyweight_kg^1 denominator).
ALLOMETRIC_EXPONENT = 0.67


@dataclass(frozen=True)
class LoggedSetScore:
    estimated_1rm_kg: float
    relative_ratio: float
    points: float


def estimate_1rm_kg(weight_kg: float, reps: int) -> float:
    """Epley formula, with reps clamped to EPLEY_REP_CAP for reliability."""
    capped_reps = min(reps, EPLEY_REP_CAP)
    return weight_kg * (1 + capped_reps / 30)


def compute_relative_ratio(estimated_1rm_kg: float, bodyweight_kg: float) -> float:
    """Allometric bodyweight normalization, shared by weighted and bodyweight exercises."""
    return estimated_1rm_kg / (bodyweight_kg**ALLOMETRIC_EXPONENT)


def score_logged_set(
    *,
    exercise_type: ExerciseType,
    weight_coefficient: float,
    weight_kg: float,
    reps: int,
    bodyweight_kg: float,
    added_weight_kg: float | None = None,
) -> LoggedSetScore:
    """Score a single logged set. weight_kg is the plate/machine load for a
    weighted exercise; for a bodyweight exercise it's ignored in favor of
    bodyweight_kg + added_weight_kg as the effective load (Section 6.2)."""
    if exercise_type == ExerciseType.bodyweight:
        effective_load_kg = bodyweight_kg + (added_weight_kg or 0)
    else:
        effective_load_kg = weight_kg

    estimated_1rm = estimate_1rm_kg(effective_load_kg, reps)
    relative_ratio = compute_relative_ratio(estimated_1rm, bodyweight_kg)
    points = relative_ratio * weight_coefficient

    return LoggedSetScore(
        estimated_1rm_kg=estimated_1rm, relative_ratio=relative_ratio, points=points
    )


def compute_bar_total(best_points_per_exercise: list[tuple[MuscleGroup, float]]) -> float:
    """bar_total = sum over muscle groups of AVG(best-ever points per exercise
    logged in that group). See RankD_plan.md Section 6.4 for why this replaced
    a flat sum: it keeps bar_total anchored to per-group strength rather than
    how many exercises a user bothered to log.

    `best_points_per_exercise` is one (muscle_group, points) entry per exercise
    the user has ever logged, where points is already that exercise's
    best-ever value (the MAX(points) reduction happens before this call, e.g.
    via a GROUP BY query - this function only does the per-group averaging).
    A muscle group with no entries simply doesn't appear in the input and
    contributes nothing to the sum.
    """
    points_by_group: dict[MuscleGroup, list[float]] = {}
    for muscle_group, points in best_points_per_exercise:
        points_by_group.setdefault(muscle_group, []).append(points)

    return sum(sum(points) / len(points) for points in points_by_group.values())
