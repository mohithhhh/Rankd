# RankD

Strength rankings for your local gym. Log your lifts, climb a tier ladder from Bronze to Olympian, and see where you stand against the people you actually train with.

RankD is inspired by Liftoff, with three differences:

- **A curated exercise list.** It has about 40 exercises, not 400+. Bodyweight movements (push-ups, pull-ups, dips) are on it so beginners who don't squat, bench or deadlift still get a fair rank from day one.
- **Gym-first.** The leaderboards that matter are per gym, not global.
- **Fair across body sizes.** Every score is adjusted for bodyweight, so a 60 kg lifter and a 100 kg lifter compete on the same board.

## How ranking works

Every logged set gets a score:

1. **Estimate a one-rep max** with the Epley formula: `weight × (1 + reps / 30)`. Reps are capped at 12 for the estimate.
2. **Adjust for bodyweight** (allometric scaling): `1RM / bodyweight^0.67`. Bodyweight exercises use bodyweight plus any added weight as the load, with the same adjustment.
3. **Weight by exercise:** `points = ratio × coefficient`. Squat and deadlift are 1.5, other compound lifts 1.2–1.3, isolation work 1.0.

Your overall score (`bar_total`) is built from your best-ever sets, not your volume:

- For each muscle group (push, pull, legs, core, full body), average your best points on each exercise you've logged in that group.
- Add up those group averages. A group you've never trained adds nothing.

Logging the same weight twice, or padding your log with light accessory work, doesn't raise your rank. Only a new best does.

That one score drives three rankings:

| Ranking | Compared against | Updates |
|---|---|---|
| **Tier** (Bronze 3 → Olympian) | Fixed global point thresholds | Live, computed when read |
| **Gym rank** | Other members of your gym | Live, computed when read |
| **Weekly champion** | Heaviest raw weight on squat, bench and deadlift this week, at your gym | Precomputed; resets every Monday |

The full reasoning is in [`RankD_plan.md`](RankD_plan.md), including the two formulas that were revised after testing them against real numbers and the alternatives that were rejected. Read it before changing scoring or the schema.

## What's in the app

- **Dashboard:** your tier on the ladder with points to the next level, your gym rank, this week's heaviest lifts, and how many points each muscle group contributes.
- **Log a lift:** pick a muscle group, pick an exercise, and add sets. The whole session saves at once. You then see points per set, any new bests, and whether you moved up a tier.
- **Ranks:** your gym's leaderboard with a top-3 podium, plus the weekly boards.
- **History:** every set grouped by day, with past bests marked.
- **Profile:** edit your username and bodyweight, see your gyms, and get the join code for any gym you run.
- **Onboarding:** sign in, set up a profile, then join a gym with a code or create one.

## Repository layout

```
gym-app-backend/    FastAPI + SQLAlchemy 2.0 + Alembic, Postgres (Supabase)
  app/api/            routers (users, gyms, memberships, exercises, logged-sets, tiers)
  app/services/       scoring (pure functions), tiers, leaderboards, weekly bests
  scripts/            seed.py, seed_demo.py, refresh_weekly_bests.py
  openapi.json        committed API schema, the contract for the frontend
gym-app-frontend/   Next.js 16 (App Router), Tailwind 4, shadcn/ui
  app/(app)/          signed-in pages: dashboard, log, ranks, history, profile
  lib/api/            typed API client generated from openapi.json
RankD_plan.md       design doc: schema, formulas, decisions, build order
CLAUDE.md           working notes for Claude Code
render.yaml         backend deploy config (Render)
```

## Running it locally

You need Python 3.13, [uv](https://github.com/astral-sh/uv), Node 20+, and Docker. Docker isn't required if you use the shared Supabase database instead.

### 1. Backend

```bash
cd gym-app-backend
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt
cp .env.example .env
```

Use a throwaway local Postgres so you don't touch the shared Supabase database. Environment variables override `.env`:

```bash
docker run -d --name rankd-pg -e POSTGRES_PASSWORD=rankd -e POSTGRES_DB=rankd -p 54329:5432 postgres:16-alpine
export DATABASE_URL=postgresql+psycopg://postgres:rankd@localhost:54329/rankd
export AUTH_DISABLED=true

alembic upgrade head
python scripts/seed.py        # exercises + tier thresholds
python scripts/seed_demo.py   # demo gym "Iron Works" (join code DEMO2026), 8 lifters, 4 weeks of history
uvicorn app.main:app --reload # http://localhost:8000/docs
```

To use the shared Supabase database instead, fill `DATABASE_URL` and `SUPABASE_JWT_SECRET` in `.env` (see the comments in `.env.example`) and skip the Docker step. Don't run `seed_demo.py` against a database real people use.

### 2. Frontend

```bash
cd gym-app-frontend
npm install
cp .env.local.example .env.local   # dev auth mode, API at http://localhost:8000
npm run dev                        # http://localhost:3000
```

In dev mode the login screen asks for a user id instead of Google. The default id (all zeros) is the demo gym's admin, `alex.r`. Any other UUID is a brand-new user who goes through onboarding; join the demo gym with code `DEMO2026`.

## Auth

- **Production:** Supabase Auth with Google sign-in. The backend checks Supabase's JWT locally against `SUPABASE_JWT_SECRET`, and the token's `sub` is the user id.
- **Development:** set `AUTH_DISABLED=true` on the backend and `NEXT_PUBLIC_AUTH_MODE=dev` on the frontend. Requests then carry an `X-Dev-User-Id` header instead of a token, so you can act as any user. The backend refuses to start with `AUTH_DISABLED=true` when `ENV=production`.

Row-level security is off on purpose: FastAPI is the only thing that talks to Postgres, and it enforces gym membership itself.

## Common tasks

| Task | Command (from the app's folder) |
|---|---|
| Backend tests | `python -m pytest` (bare `pytest` can't import `app`) |
| Frontend lint / build | `npm run lint`, `npm run build` |
| New migration | `alembic revision --autogenerate -m "..."`, review the file, then `alembic upgrade head` |
| Refresh this week's weekly boards | `python scripts/refresh_weekly_bests.py` |
| After changing an API route or response model | Regenerate `openapi.json` (see below), then `npm run gen:api-types` in the frontend |

```bash
# from gym-app-backend/
python -c "import json; from app.main import app; json.dump(app.openapi(), open('openapi.json','w'), indent=2)"
```

The shared Supabase database is used by the whole team, so only one person should run `alembic upgrade head` against it at a time. Pull the latest `alembic/versions/` before generating a new migration.

## Deployment

The backend deploys to Render from `render.yaml`. Migrations run automatically before each deploy. `DATABASE_URL` and `SUPABASE_JWT_SECRET` are set in the Render dashboard.

Render currently runs with `AUTH_DISABLED=true`, because Google sign-in isn't wired up end to end yet. Anyone who can reach that API can act as any user, so switch it off before real users arrive.

## Known gaps

- **Weekly boards don't update when you log.** They update only when `scripts/refresh_weekly_bests.py` runs, and nothing schedules it yet.
- **Tier thresholds are placeholders.** The 16 bands in `scripts/seed.py` were checked by hand against reference lifters but haven't been tuned with real usage data.
- **Deliberately deferred:** social features, streaks, lift verification (the `verified` column is a placeholder), push notifications, a public gym leaderboard page, and a most-improved view. See section 9 of the plan.

## License

[MIT](LICENSE)
