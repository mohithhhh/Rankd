from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, get_current_user
from app.infra.db.orm import TierThreshold
from app.infra.db.session import get_db
from app.models.tier import TierThresholdOut

router = APIRouter(prefix="/tiers", tags=["tiers"])


@router.get("/thresholds", response_model=list[TierThresholdOut])
def list_tier_thresholds(
    _current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The global ladder, lowest band first - lets clients draw progress toward
    the next sub-level and badge leaderboard rows without hardcoding seed.py's
    bands (which are still placeholders pending real usage data)."""
    return db.query(TierThreshold).order_by(TierThreshold.min_points).all()
