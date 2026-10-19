# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Monorepo with two apps: `gym-app-backend` (FastAPI) and `gym-app-frontend` (Next.js 16 App Router, Tailwind 4, shadcn/ui). **`RankD_plan.md`** at the repo root is the authoritative design doc — schema rationale, formula derivations (including two formulas that were deliberately revised after being caught wrong against real data), rejected alternatives, and phase-by-phase build order. Read it before making schema or scoring changes; don't re-litigate decisions it already made without a new reason.

## Commands

### Backend

Run from `gym-app-backend/`. No `pyproject.toml` — dependencies are pinned in `requirements.txt` only.

```bash
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt

cp .env.example .env   # fill in DATABASE_URL (Supabase Session Pooler) + SUPABASE_JWT_SECRET

uvicorn app.main:app --reload   # serves /docs (Swagger) and /health

python -m pytest                           # full suite (bare `pytest` can't import `app` - no conftest/pythonpath)
python -m pytest tests/test_scoring.py -v  # scoring engine only — no DB needed, pure functions
python -m pytest tests/test_auth.py -v     # JWT verification only — no DB needed

alembic revision --autogenerate -m "..."   # review the diff manually before applying
alembic upgrade head

python scripts/seed.py                 # seeds exercises + tier_thresholds
python scripts/refresh_weekly_bests.py # manual trigger for weekly_exercise_bests (no scheduler yet)
python scripts/seed_demo.py            # demo gym "Iron Works" (join code DEMO2026) with 8 lifters + history; refuses ENV=production
```

`DATABASE_URL` in `.env` points at the shared Supabase instance. For throwaway local work, run Postgres in Docker and override it per command (env vars beat `.env`):

```bash
docker run -d --name rankd-pg -e POSTGRES_PASSWORD=rankd -e POSTGRES_DB=rankd -p 54329:5432 postgres:16-alpine
export DATABASE_URL=postgresql+psycopg://postgres:rankd@localhost:54329/rankd AUTH_DISABLED=true
alembic upgrade head && python scripts/seed.py && python scripts/seed_demo.py
```

After changing a route or response model, refresh the committed schema snapshot, then regenerate frontend types:

```bash
python -c "import json; from app.main import app; json.dump(app.openapi(), open('openapi.json','w'), indent=2)"
```

Set `AUTH_DISABLED=true` in `.env` for local dev without real Supabase tokens (hard-fails at startup if `ENV=production`; see `app/config.py`). With it set, pass header `X-Dev-User-Id: <uuid>` to impersonate different fake users.

### Frontend

Run from `gym-app-frontend/`. No test runner is configured.

```bash
cp .env.local.example .env.local   # defaults to NEXT_PUBLIC_AUTH_MODE=dev against http://localhost:8000
npm run dev                        # :3000
npm run lint
npm run build
npm run gen:api-types              # regenerate lib/api/schema.d.ts from ../gym-app-backend/openapi.json
```

**Read `gym-app-frontend/AGENTS.md` first** — this Next.js version has breaking changes (e.g. Middleware is now `proxy.ts`); check `node_modules/next/dist/docs/` before writing Next code from memory.

### Deploy

`render.yaml` deploys the backend only (Render free plan; `preDeployCommand: alembic upgrade head` runs migrations on every deploy). It currently sets `AUTH_DISABLED=true` with `ENV=development`; `DATABASE_URL` and `SUPABASE_JWT_SECRET` are set in the Render dashboard.

## Architecture

### Backend

**Auth**: Supabase issues HS256 JWTs (Google OAuth is the sign-in UX, Supabase is the sole token issuer). The backend does pure local signature verification against `SUPABASE_JWT_SECRET` (`app/infra/auth.py`) — no per-request call to Supabase. The `sub` claim *is* `users.id` directly, no separate internal ID layer. `app/api/dependencies.py::get_current_user` is the single auth entry point every router depends on.

**RLS is intentionally off.** FastAPI is the sole gatekeeper to Postgres — this deviates from the usual Supabase pattern (client SDK talking to Postgres directly under row-level policies). Authorization is enforced entirely in the API layer: `app/services/memberships.py::require_membership` is the one place "is this user allowed to touch this gym's data" is checked, and every gym-scoped write/read routes through it. When adding a new gym-scoped endpoint, call it rather than re-deriving the check.

**Scoring engine (`app/services/scoring.py`) is pure functions — no FastAPI, no DB session, no ORM types beyond the `ExerciseType`/`MuscleGroup` enums.** This isolation is deliberate: it's the one module where a silent bug corrupts every tier and leaderboard downstream, since nothing here is cached — tier and gym rank are always recomputed from `logged_sets` at read time. Formula chain per logged set: Epley 1RM estimate (reps capped at 12) → allometric bodyweight normalization (`^0.67`, applied identically to weighted *and* bodyweight exercises — see plan Section 6 for why an earlier `^1` version was wrong) → `points = relative_ratio × exercise.weight_coefficient`. The per-user `bar_total` (`compute_bar_total`) is *not* a flat sum of points: it's the sum, across muscle groups, of the average of each exercise's best-ever points in that group — a muscle group the user hasn't touched contributes nothing (not zero). This is what makes rank PR-based and resistant to spam-logging; don't reintroduce a flat sum.

Numeric/Decimal boundary: Postgres `Numeric` columns come back from SQLAlchemy as `Decimal`; scoring.py works in plain `float`. The conversion happens explicitly at the ORM↔scoring boundary (`app/api/logged_sets.py`, `app/services/tiers.py`) — keep new callers consistent with that pattern rather than passing Decimals into scoring.py.

**Three ranking features, all derived from the same `bar_total`, two computed live and one materialized** (see plan Section 7 for the full rationale):
- **Tier/League** (`app/services/tiers.py`) — `bar_total` vs. fixed, global `tier_thresholds` (not per-user/per-gym). Computed at read time.
- **Gym Rank** (`app/services/leaderboards.py`) — same `bar_total`, ranked against other members of one gym. Also read-time; top N is `min(20, total_ranked_members)`, never hardcoded. No dedicated leaderboard table.
- **Weekly Champion** (`app/services/weekly_bests.py`, table `weekly_exercise_bests`) — the one materialized/precomputed feature, because recomputing "best raw weight this week per exercise per gym" live doesn't scale like the other two. Uses raw `weight_kg`, not the normalized ratio (bragging-rights framing, distinct from tier's fairness framing). Repopulated by `scripts/refresh_weekly_bests.py`; a real scheduler is deferred until the query logic is proven.

**Idempotency**: `logged_sets.client_request_id` is a unique client-supplied key. `app/api/logged_sets.py::_create_one` checks for an existing row with that key before doing anything else, so a retried request from a flaky connection replays the original row instead of erroring or duplicating. Keep this check first in any new write path that touches `logged_sets`.

**Schema notes that aren't obvious from the models alone**: `gyms` has no `owner_id` — ownership is `memberships.role == admin`, deliberately avoiding a parallel "owner" concept. `logged_sets.bodyweight_at_log_kg` is snapshotted at write time (not looked up live from `users.bodyweight_kg`) so a later bodyweight change doesn't retroactively rescore historical lifts. `logged_sets.estimated_1rm_kg`/`relative_ratio`/`points` are nullable because Alembic's schema landed before the scoring engine was wired into the write path (build-order Step 3 vs. Step 5) — they're populated for every row created through the current API.

### Frontend

**The API contract is generated, not hand-typed.** `gym-app-backend/openapi.json` is a committed snapshot of the FastAPI schema; `lib/api/schema.d.ts` is generated from it (`npm run gen:api-types`) and feeds the typed `openapi-fetch` client in `lib/api/client.ts`. After changing a backend route or response model, refresh `openapi.json` and regenerate the types — don't hand-edit `schema.d.ts`.

**All API calls are server-side** (Server Components, Server Actions, Route Handlers) — there is no CORS config on the backend. `lib/api/client.ts` injects auth headers per request via `lib/auth/session.ts::getAuthHeaders`, the single branch point between the backend's two auth modes: `NEXT_PUBLIC_AUTH_MODE=dev` sends `X-Dev-User-Id` from a cookie (matches the backend's `AUTH_DISABLED`), `supabase` sends the session's Bearer token. `proxy.ts` only refreshes the Supabase session cookie and no-ops in dev mode.

**Route guarding mirrors the backend's single-gatekeeper idea.** Every page under `app/(app)/` is protected by `lib/auth/require-onboarded-user.ts::requireOnboardedUser`, which redirects through `/login` → `/onboarding` (no profile) → `/gyms/join` (no memberships). Call it from new `(app)` routes rather than re-checking. `lib/api/resources.ts` holds wrappers only for calls repeated in 3+ places; otherwise call `api.GET(...)` inline.

UI: `components/ui/` is shadcn-generated; app-specific components live in `components/rankd/`.
