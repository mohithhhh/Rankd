import uuid

from sqlalchemy.orm import Session

from app.infra.db.orm import LoggedSet, User
from app.models.leaderboard import GymLeaderboardEntry
from app.services.tiers import get_bar_total


def get_gym_leaderboard(db: Session, gym_id: uuid.UUID) -> list[GymLeaderboardEntry]:
    """Percentile-ranked, gym-scoped leaderboard (Section 5/7): only members
    who've logged at least one scored set at this specific gym are ranked -
    someone with zero logged_sets here has nothing to rank. N is dynamic
    (min(20, total_ranked_members)), not hardcoded, so early-stage gyms with
    fewer than 20 members still show everyone."""
    member_ids = [
        user_id
        for (user_id,) in db.query(LoggedSet.user_id)
        .filter(LoggedSet.gym_id == gym_id, LoggedSet.points.isnot(None))
        .distinct()
        .all()
    ]

    scored = [(user_id, get_bar_total(db, user_id, gym_id=gym_id)) for user_id in member_ids]
    scored.sort(key=lambda entry: entry[1], reverse=True)

    total = len(scored)
    top_n = scored[: min(20, total)]

    entries = []
    for rank, (user_id, bar_total) in enumerate(top_n, start=1):
        user = db.get(User, user_id)
        # Standard percentile-rank: share of the field this user outranks.
        percentile = 100 * (total - rank) / total if total else 0.0
        entries.append(
            GymLeaderboardEntry(
                rank=rank,
                percentile=percentile,
                user_id=user_id,
                username=user.username,
                bar_total=bar_total,
            )
        )
    return entries
