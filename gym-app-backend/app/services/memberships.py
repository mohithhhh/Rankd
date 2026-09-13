import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.infra.db.orm import Gym, Membership


def require_membership(db: Session, user_id: uuid.UUID, gym_id: uuid.UUID) -> Membership:
    """Raise 404 if the gym doesn't exist, 403 if the user isn't a member of it.

    RLS is off (per the plan's auth design) - FastAPI is the sole gatekeeper,
    so this check is what actually enforces "you can only log sets at gyms
    you've joined" instead of Postgres row-level policies.
    """
    gym = db.get(Gym, gym_id)
    if gym is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")

    membership = (
        db.query(Membership)
        .filter(Membership.user_id == user_id, Membership.gym_id == gym_id)
        .first()
    )
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this gym"
        )
    return membership
