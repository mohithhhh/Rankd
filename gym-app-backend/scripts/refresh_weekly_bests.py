"""Manually-triggerable population of weekly_exercise_bests (Step 6).

Run this after logging weekly-eligible (SBD) sets to refresh the current
week's board. A real scheduler (APScheduler/cron) can call this same function
once the query logic here is proven - see RankD_plan.md Step 6.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.infra.db.session import SessionLocal
from app.services.weekly_bests import get_current_week_start, refresh_weekly_bests


def main():
    db = SessionLocal()
    try:
        count = refresh_weekly_bests(db)
        print(f"Refreshed {count} weekly_exercise_bests rows for week starting {get_current_week_start()}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
