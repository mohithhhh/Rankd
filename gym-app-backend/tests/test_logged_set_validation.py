"""Sanity ceilings on LoggedSetCreate - pure Pydantic validation, no DB. These
guard against a bad input permanently inflating a tier, since best-ever points
drive rank and there's no edit/delete on a logged set yet."""

import uuid

import pytest
from pydantic import ValidationError

from app.models.logged_set import MAX_LOGGED_REPS, MAX_LOGGED_WEIGHT_KG, LoggedSetCreate

BASE = {
    "gym_id": uuid.uuid4(),
    "exercise_id": uuid.uuid4(),
    "reps": 5,
    "weight_kg": 100,
    "client_request_id": uuid.uuid4(),
}


def _with(**over):
    return {**BASE, **over}


def test_at_the_ceiling_is_accepted():
    LoggedSetCreate(**_with(weight_kg=MAX_LOGGED_WEIGHT_KG, reps=MAX_LOGGED_REPS))


def test_one_over_the_weight_ceiling_is_rejected():
    with pytest.raises(ValidationError):
        LoggedSetCreate(**_with(weight_kg=MAX_LOGGED_WEIGHT_KG + 0.01))


def test_one_over_the_reps_ceiling_is_rejected():
    with pytest.raises(ValidationError):
        LoggedSetCreate(**_with(reps=MAX_LOGGED_REPS + 1))


def test_added_weight_over_the_ceiling_is_rejected():
    with pytest.raises(ValidationError):
        LoggedSetCreate(**_with(added_weight_kg=MAX_LOGGED_WEIGHT_KG + 1))


def test_added_weight_at_the_ceiling_is_accepted():
    LoggedSetCreate(**_with(added_weight_kg=MAX_LOGGED_WEIGHT_KG))


def test_added_weight_still_optional():
    LoggedSetCreate(**_with(added_weight_kg=None))


def test_zero_reps_still_rejected_by_the_existing_gt_bound():
    with pytest.raises(ValidationError):
        LoggedSetCreate(**_with(reps=0))


def test_negative_weight_still_rejected_by_the_existing_ge_bound():
    with pytest.raises(ValidationError):
        LoggedSetCreate(**_with(weight_kg=-1))


def test_ordinary_values_well_within_bounds_are_accepted():
    LoggedSetCreate(**_with(weight_kg=60, reps=8))
