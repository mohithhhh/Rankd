"""Manual/on-demand population of weekly_exercise_bests (Step 6).

The normal path is now automatic: app/api/logged_sets.py schedules
refresh_weekly_bests_in_new_session() as a background task whenever a
weekly-eligible (SBD) set is logged, so the board stays current without a
cron job. This script remains for a one-off fixup (e.g. after manually
editing rows, or recovering from a background task that failed silently).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.weekly_bests import get_current_week_start, refresh_weekly_bests_in_new_session


def main():
    count = refresh_weekly_bests_in_new_session()
    print(f"Refreshed {count} weekly_exercise_bests rows for week starting {get_current_week_start()}")


if __name__ == "__main__":
    main()
