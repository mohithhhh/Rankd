from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# SQLAlchemy table models (users, gyms, memberships, exercises, logged_sets,
# tier_thresholds, weekly_exercise_bests) get defined here per Section 5 of the plan.
