"""Percentile formula for the gym leaderboard - regression coverage for the
"0th pct" bug a solo/last-place member used to see (plain (total-rank)/total
reads rank==total as 0)."""

import uuid
from unittest.mock import MagicMock

import pytest

from app.infra.db.orm import Sex, User
from app.services import leaderboards


def _leaderboard_for(monkeypatch, scores: dict[uuid.UUID, float]):
    """scores: user_id -> bar_total, strictly deterministic ordering. Stubs
    get_bar_total so this exercises only the ranking/percentile math, not the
    real scoring pipeline (that's scoring.py's/tiers.py's job to test)."""
    db = MagicMock()
    db.query.return_value.filter.return_value.distinct.return_value.all.return_value = [
        (uid,) for uid in scores
    ]
    users = {
        uid: User(id=uid, username=f"user-{i}", email="x@example.com", sex=Sex.male, bodyweight_kg=80)
        for i, uid in enumerate(scores)
    }
    db.get.side_effect = lambda _model, uid: users[uid]
    monkeypatch.setattr(
        leaderboards, "get_bar_total", lambda _db, user_id, gym_id=None: scores[user_id]
    )
    return leaderboards.get_gym_leaderboard(db, uuid.uuid4())


def test_solo_ranked_member_gets_top_percentile_not_zero(monkeypatch):
    uid = uuid.uuid4()
    entries = _leaderboard_for(monkeypatch, {uid: 12.3})
    assert entries[0].rank == 1
    assert entries[0].percentile == pytest.approx(100.0)


def test_last_place_gets_a_nonzero_percentile(monkeypatch):
    ids = [uuid.uuid4() for _ in range(4)]
    scores = {uid: 10.0 - i for i, uid in enumerate(ids)}  # strictly descending
    entries = _leaderboard_for(monkeypatch, scores)
    assert entries[-1].rank == 4
    assert entries[-1].percentile == pytest.approx(25.0)  # 100/4, not 0


def test_percentiles_are_evenly_spaced_top_to_bottom(monkeypatch):
    ids = [uuid.uuid4() for _ in range(5)]
    scores = {uid: 100.0 - i for i, uid in enumerate(ids)}
    entries = _leaderboard_for(monkeypatch, scores)
    assert [round(e.percentile) for e in entries] == [100, 80, 60, 40, 20]


def test_highest_score_ranks_first(monkeypatch):
    ids = [uuid.uuid4() for _ in range(3)]
    scores = {ids[0]: 5.0, ids[1]: 50.0, ids[2]: 25.0}
    entries = _leaderboard_for(monkeypatch, scores)
    assert [e.user_id for e in entries] == [ids[1], ids[2], ids[0]]


def test_empty_gym_returns_an_empty_list(monkeypatch):
    assert _leaderboard_for(monkeypatch, {}) == []
