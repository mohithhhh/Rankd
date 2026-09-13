import enum
import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Sex(str, enum.Enum):
    male = "male"
    female = "female"


class MembershipRole(str, enum.Enum):
    member = "member"
    admin = "admin"


class ExerciseType(str, enum.Enum):
    weighted = "weighted"
    bodyweight = "bodyweight"


class MuscleGroup(str, enum.Enum):
    push = "push"
    pull = "pull"
    legs = "legs"
    core = "core"
    full_body = "full_body"


class Tier(str, enum.Enum):
    bronze = "bronze"
    silver = "silver"
    gold = "gold"
    platinum = "platinum"
    diamond = "diamond"
    olympian = "olympian"


class User(Base):
    __tablename__ = "users"

    # Mirrors Supabase Auth's user UUID (the JWT `sub` claim) - not server-generated.
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    username: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    sex: Mapped[Sex] = mapped_column(Enum(Sex, name="sex"), nullable=False)
    bodyweight_kg: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Gym(Base):
    __tablename__ = "gyms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    city: Mapped[str] = mapped_column(String, nullable=False)
    join_code: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    brand_color: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("user_id", "gym_id", name="uq_membership_user_gym"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    gym_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gyms.id"), nullable=False, index=True
    )
    role: Mapped[MembershipRole] = mapped_column(
        Enum(MembershipRole, name="membership_role"), nullable=False
    )
    joined_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    type: Mapped[ExerciseType] = mapped_column(
        Enum(ExerciseType, name="exercise_type"), nullable=False
    )
    muscle_group: Mapped[MuscleGroup] = mapped_column(
        Enum(MuscleGroup, name="muscle_group"), nullable=False
    )
    weight_coefficient: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False)
    weekly_eligible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class LoggedSet(Base):
    __tablename__ = "logged_sets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    gym_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gyms.id"), nullable=False, index=True
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exercises.id"), nullable=False, index=True
    )
    weight_kg: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    added_weight_kg: Mapped[float | None] = mapped_column(Numeric(7, 2), nullable=True)
    bodyweight_at_log_kg: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    # Nullable until Step 5 wires services/scoring.py into the write path -
    # Step 3's POST only stores raw weight/reps/exercise per the build order.
    estimated_1rm_kg: Mapped[float | None] = mapped_column(Numeric(7, 2), nullable=True)
    relative_ratio: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    points: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    logged_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    client_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, unique=True
    )


class TierThreshold(Base):
    __tablename__ = "tier_thresholds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    min_points: Mapped[int] = mapped_column(Integer, nullable=False)
    tier: Mapped[Tier] = mapped_column(Enum(Tier, name="tier"), nullable=False)
    sub_level: Mapped[int] = mapped_column(Integer, nullable=False)


class WeeklyExerciseBest(Base):
    __tablename__ = "weekly_exercise_bests"
    __table_args__ = (
        UniqueConstraint(
            "gym_id", "exercise_id", "user_id", "week_start", name="uq_weekly_best_scope"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    gym_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gyms.id"), nullable=False, index=True
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exercises.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    week_start: Mapped["Date"] = mapped_column(Date, nullable=False, index=True)
    weight_kg: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
    estimated_1rm_kg: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
