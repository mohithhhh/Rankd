import secrets
import string
import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infra.db.orm import Gym, Membership, MembershipRole

_JOIN_CODE_ALPHABET = string.ascii_uppercase + string.digits
_JOIN_CODE_LENGTH = 8
_MAX_JOIN_CODE_ATTEMPTS = 5


class JoinCodeExhaustedError(Exception):
    """Every generated join code collided with an existing gym's."""


def normalize_join_code(code: str) -> str:
    """Codes are stored uppercase; accept however a user typed or a QR encoded them."""
    return code.strip().upper()


def _generate_join_code() -> str:
    return "".join(secrets.choice(_JOIN_CODE_ALPHABET) for _ in range(_JOIN_CODE_LENGTH))


def create_gym(
    db: Session,
    *,
    name: str,
    city: str,
    brand_color: str | None = None,
    admin_user_id: uuid.UUID | None = None,
) -> Gym:
    """Create a gym with a fresh unique join code. If admin_user_id is given they
    become its admin member (ownership is memberships.role == admin, per the
    plan - there is no owner_id); otherwise the gym starts with no members.

    Shared by POST /gyms and scripts/create_gym.py so both paths mint codes
    the same way."""
    for _ in range(_MAX_JOIN_CODE_ATTEMPTS):
        gym = Gym(name=name, city=city, brand_color=brand_color, join_code=_generate_join_code())
        db.add(gym)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            continue

        if admin_user_id is not None:
            db.add(Membership(user_id=admin_user_id, gym_id=gym.id, role=MembershipRole.admin))
        db.commit()
        db.refresh(gym)
        return gym

    raise JoinCodeExhaustedError("Could not generate a unique join code")
