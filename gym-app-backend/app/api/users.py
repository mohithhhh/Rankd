import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, get_current_user
from app.infra.db.orm import User
from app.infra.db.session import get_db
from app.models.tier import TierOut
from app.models.user import UserCreate, UserOut, UserUpdate
from app.services.tiers import get_bar_total, get_tier_for_bar_total

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/me", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_my_profile(
    body: UserCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.get(User, current_user.id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile already exists")

    if current_user.email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token has no email claim"
        )

    user = User(
        id=current_user.id,
        username=body.username,
        email=current_user.email,
        sex=body.sex,
        bodyweight_kg=body.bodyweight_kg,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return user


@router.patch("/me", response_model=UserOut)
def update_my_profile(
    body: UserUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    if body.username is not None:
        user.username = body.username
    if body.bodyweight_kg is not None:
        user.bodyweight_kg = body.bodyweight_kg

    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}/tier", response_model=TierOut)
def get_user_tier(
    user_id: uuid.UUID,
    _current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.get(User, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    bar_total = get_bar_total(db, user_id)
    threshold = get_tier_for_bar_total(db, bar_total)
    if threshold is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="tier_thresholds is not seeded",
        )

    return TierOut(bar_total=bar_total, tier=threshold.tier, sub_level=threshold.sub_level)
