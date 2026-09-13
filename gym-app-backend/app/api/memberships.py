from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, get_current_user
from app.infra.db.orm import Gym, Membership, MembershipRole
from app.infra.db.session import get_db
from app.models.membership import MembershipJoinRequest, MembershipOut

router = APIRouter(prefix="/memberships", tags=["memberships"])


@router.post("/join", response_model=MembershipOut, status_code=status.HTTP_201_CREATED)
def join_gym(
    body: MembershipJoinRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    gym = db.query(Gym).filter(Gym.join_code == body.join_code).first()
    if gym is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid join code")

    existing = (
        db.query(Membership)
        .filter(Membership.user_id == current_user.id, Membership.gym_id == gym.id)
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Already a member of this gym"
        )

    membership = Membership(user_id=current_user.id, gym_id=gym.id, role=MembershipRole.member)
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


@router.get("/me", response_model=list[MembershipOut])
def list_my_memberships(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Membership).filter(Membership.user_id == current_user.id).all()
