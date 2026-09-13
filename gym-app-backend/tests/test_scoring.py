import pytest

from app.infra.db.orm import ExerciseType, MuscleGroup
from app.services.scoring import (
    compute_bar_total,
    compute_relative_ratio,
    estimate_1rm_kg,
    score_logged_set,
)


def test_estimate_1rm_basic():
    assert estimate_1rm_kg(weight_kg=100, reps=5) == pytest.approx(116.667, abs=1e-3)


def test_estimate_1rm_reps_are_capped_for_reliability():
    # 25 reps should be treated the same as the 12-rep cap, not extrapolated further.
    assert estimate_1rm_kg(weight_kg=70, reps=25) == estimate_1rm_kg(weight_kg=70, reps=12)


def test_relative_ratio_known_value():
    # 75^0.67 ~= 18.04
    ratio = compute_relative_ratio(estimated_1rm_kg=100, bodyweight_kg=75)
    assert ratio == pytest.approx(100 / 75**0.67, rel=1e-9)


def test_score_logged_set_weighted_exercise():
    result = score_logged_set(
        exercise_type=ExerciseType.weighted,
        weight_coefficient=1.5,
        weight_kg=93.75,
        reps=1,
        bodyweight_kg=75,
    )
    assert result.estimated_1rm_kg == pytest.approx(estimate_1rm_kg(93.75, 1), rel=1e-9)
    assert result.points == pytest.approx(result.relative_ratio * 1.5, rel=1e-9)
    assert result.points > 0


def test_score_logged_set_bodyweight_exercise_uses_effective_load():
    # Dip: bodyweight 75kg + 20kg added weight, 8 reps.
    result = score_logged_set(
        exercise_type=ExerciseType.bodyweight,
        weight_coefficient=1.2,
        weight_kg=0,  # ignored for bodyweight exercises
        reps=8,
        bodyweight_kg=75,
        added_weight_kg=20,
    )
    expected_1rm = estimate_1rm_kg(weight_kg=95, reps=8)  # 75 + 20 effective load
    assert result.estimated_1rm_kg == pytest.approx(expected_1rm, rel=1e-9)


def test_score_logged_set_bodyweight_exercise_defaults_added_weight_to_zero():
    result = score_logged_set(
        exercise_type=ExerciseType.bodyweight,
        weight_coefficient=1.2,
        weight_kg=0,
        reps=10,
        bodyweight_kg=80,
        added_weight_kg=None,
    )
    expected_1rm = estimate_1rm_kg(weight_kg=80, reps=10)
    assert result.estimated_1rm_kg == pytest.approx(expected_1rm, rel=1e-9)


def test_bodyweight_and_weighted_formulas_score_comparable_effort_equally():
    """Regression test for the equity bug: benching exactly bodyweight used to
    outscore a comparably-hard bodyweight exercise under the old formula
    (bodyweight_kg^1 vs bodyweight_kg^0.67). Both now use ^0.67, so an
    equivalent effective load + reps + coefficient must score identically
    regardless of exercise type."""
    weighted = score_logged_set(
        exercise_type=ExerciseType.weighted,
        weight_coefficient=1.3,
        weight_kg=75,
        reps=10,
        bodyweight_kg=75,
    )
    bodyweight = score_logged_set(
        exercise_type=ExerciseType.bodyweight,
        weight_coefficient=1.3,
        weight_kg=0,
        reps=10,
        bodyweight_kg=75,
        added_weight_kg=0,
    )
    assert weighted.points == pytest.approx(bodyweight.points, rel=1e-9)


def test_compute_bar_total_single_exercise_per_group_matches_naive_sum():
    entries = [
        (MuscleGroup.legs, 7.8),
        (MuscleGroup.push, 5.41),
        (MuscleGroup.pull, 9.36),
    ]
    assert compute_bar_total(entries) == pytest.approx(7.8 + 5.41 + 9.36, rel=1e-9)


def test_compute_bar_total_averages_within_a_group_instead_of_summing():
    # Two exercises in the same group must average, not add - this is the
    # entire point of the fix: logging more in one group shouldn't inflate it.
    entries = [(MuscleGroup.legs, 10.0), (MuscleGroup.legs, 6.0)]
    assert compute_bar_total(entries) == pytest.approx(8.0, rel=1e-9)


def test_compute_bar_total_padding_with_a_weak_exercise_lowers_the_group_average():
    strong_only = compute_bar_total([(MuscleGroup.legs, 7.8)])
    strong_plus_weak_padding = compute_bar_total(
        [(MuscleGroup.legs, 7.8), (MuscleGroup.legs, 1.0)]
    )
    assert strong_plus_weak_padding < strong_only


def test_compute_bar_total_logging_all_exercises_does_not_dwarf_logging_a_few():
    """The regression test for the original bug: an intermediate lifter doing
    only SBD should land close to the same bar_total as if they'd also logged
    every accessory exercise at equally-moderate levels - not ~7x higher."""
    sbd_only = [
        (MuscleGroup.legs, 7.8),  # Back Squat
        (MuscleGroup.push, 5.41),  # Bench Press
        (MuscleGroup.pull, 9.36),  # Deadlift
    ]
    full_log = sbd_only + [
        (MuscleGroup.legs, 6.66),
        (MuscleGroup.legs, 12.99),
        (MuscleGroup.legs, 4.33),
        (MuscleGroup.legs, 10.10),
        (MuscleGroup.legs, 3.33),
        (MuscleGroup.legs, 2.77),
        (MuscleGroup.legs, 5.55),
        (MuscleGroup.push, 4.62),
        (MuscleGroup.push, 4.87),
        (MuscleGroup.push, 5.05),
        (MuscleGroup.push, 3.25),
        (MuscleGroup.push, 2.13),
        (MuscleGroup.push, 2.20),
        (MuscleGroup.push, 2.77),
        (MuscleGroup.push, 1.39),
        (MuscleGroup.push, 0.67),
        (MuscleGroup.push, 2.22),
        (MuscleGroup.pull, 7.49),
        (MuscleGroup.pull, 4.87),
        (MuscleGroup.pull, 4.33),
        (MuscleGroup.pull, 4.69),
        (MuscleGroup.pull, 4.33),
        (MuscleGroup.pull, 1.82),
        (MuscleGroup.pull, 1.67),
        (MuscleGroup.pull, 1.39),
        (MuscleGroup.pull, 1.39),
        (MuscleGroup.core, 2.22),
        (MuscleGroup.core, 1.11),
        (MuscleGroup.core, 1.40),
        (MuscleGroup.full_body, 4.66),
        (MuscleGroup.full_body, 3.60),
        (MuscleGroup.full_body, 2.00),
    ]

    sbd_total = compute_bar_total(sbd_only)
    full_total = compute_bar_total(full_log)

    # Same underlying strength either way - the ratio should stay close to 1,
    # not the ~7x blowout the flat-sum formula produced.
    assert full_total / sbd_total < 1.5


def test_compute_bar_total_empty_input_is_zero():
    assert compute_bar_total([]) == 0
