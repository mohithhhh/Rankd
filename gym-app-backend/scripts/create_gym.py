"""Create a gym and print its join code - the operator's onboarding tool.

Gyms are created by the RankD team, not by end users (POST /gyms is
platform-admin only), and this needs only DATABASE_URL - no bearer token.
NOTE: it writes to whatever database DATABASE_URL points at, which is
currently the single shared Supabase project.

Usage:
    python scripts/create_gym.py --name "Iron Temple" --city Pune \
        --app-url https://rankd-frontend.onrender.com

    # Optionally make an existing user (must have finished onboarding) its admin:
    python scripts/create_gym.py --name ... --city ... --admin-user-id <uuid>
"""

import argparse
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.infra.db.orm import User
from app.infra.db.session import SessionLocal
from app.services.gyms import JoinCodeExhaustedError, create_gym


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a gym and print its join code.")
    parser.add_argument("--name", required=True)
    parser.add_argument("--city", required=True)
    parser.add_argument("--brand-color", help="e.g. #3d5a80 (for the future branded leaderboard)")
    parser.add_argument(
        "--admin-user-id",
        type=uuid.UUID,
        help="users.id (Supabase UID) to make this gym's admin; the user must already exist",
    )
    parser.add_argument("--app-url", help="frontend base URL, to print the QR/join link")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.admin_user_id is not None and db.get(User, args.admin_user_id) is None:
            print(
                f"No user {args.admin_user_id} yet - they must sign in and finish onboarding "
                "first (memberships need an existing users row).",
                file=sys.stderr,
            )
            return 1

        try:
            gym = create_gym(
                db,
                name=args.name.strip(),
                city=args.city.strip(),
                brand_color=args.brand_color,
                admin_user_id=args.admin_user_id,
            )
        except JoinCodeExhaustedError:
            print("Could not generate a unique join code - run it again.", file=sys.stderr)
            return 1

        print(f"Created gym: {gym.name} ({gym.city})")
        print(f"  id:        {gym.id}")
        print(f"  join code: {gym.join_code}")
        if args.app_url:
            print(f"  join link: {args.app_url.rstrip('/')}/join/{gym.join_code}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
