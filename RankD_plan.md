# Local Gym Ranking App — Project Plan

## 1. Product Overview

A Liftoff-inspired strength-ranking app, optimized for **local/specific gyms** rather than a global 400+-exercise system. Two-person team, both familiar with FastAPI, neither has professional frontend experience. Planned as production-grade, properly hosted and deployed — not a throwaway hackathon build.

**Core differentiators from Liftoff:**
- Curated exercise list specific to the founders' own gym — not 400+ exercises. Includes weighted barbell lifts *and* bodyweight exercises (push-ups, pull-ups, dips) alongside squat/bench/deadlift/OHP, specifically so beginners who don't do SBD aren't demotivated on day one.
- Onboarding flow asks the user what muscle group they're training, rather than dropping them into a huge exercise list.
- Hyperlocal framing: gym-specific leaderboards are the core hook, not a global leaderboard.

---

## 2. Tech Stack (Final)

| Layer | Choice | Notes |
|---|---|---|
| Backend | FastAPI | Team's existing strength |
| ORM / Migrations | SQLAlchemy 2.0 + Alembic | Schema defined in code, never hand-edited via UI |
| Database | Postgres, hosted on **Supabase** | Using Supabase's provisioned Postgres directly (not local Docker) since the Auth project was already created there |
| Auth | **Supabase Auth**, with **Google** as the sign-in method (Supabase's built-in Google OAuth provider) | Not Firebase Auth, not email/password as primary — Google OAuth is the login UX, Supabase remains the JWT issuer and system of record |
| Frontend | Next.js | To be **entirely vibe-coded** via Claude Code — neither founder has professional frontend experience |
| Domain / DNS / CDN | Cloudflare | Domain purchased from Cloudflare; used for DNS/CDN/SSL only, **not** as a compute runtime |
| Hosting (planned) | Vercel (frontend), Railway/Render (backend) | Azure considered and explicitly rejected as unnecessary overhead for a 2-person MVP; Cloudflare Workers/Pages + D1/Hyperdrive (an alternate plan a teammate drew up) was also explicitly rejected in favor of sticking with FastAPI, since it would require learning an entirely new edge-runtime paradigm (Durable Objects, etc.) with no strong offsetting benefit |

**Rejected alternatives, for the record (don't resurrect without reason):**
- Cloudflare Workers/Pages backend runtime — incompatible with FastAPI, different execution model entirely
- Firebase Auth / GCP Identity Platform — considered to use GCP credits, but GCP credits don't meaningfully apply to auth anyway (Firebase Auth free tier covers this scale regardless), and it would have meant maintaining RS256/JWKS verification instead of the simpler Supabase HS256 flow
- Azure hosting — no strong reason for a bootstrapped 2-person MVP; kept as a "if free credits appear" fallback only

---

## 3. Auth — Implementation Details

- **Flow**: Frontend calls Supabase client SDK `signInWithOAuth({ provider: 'google' })` → user completes Google consent → Google redirects to **Supabase's** callback URL (not the app's own) → Supabase exchanges the code and issues a **Supabase-signed JWT** (HS256).
- **Backend verification**: FastAPI verifies the JWT using `SUPABASE_JWT_SECRET` (HS256) — no Supabase SDK call needed per-request, pure local JWT verification.
- **User identity**: extract `sub` claim (Supabase's user UUID) and use it **directly as `users.id`** — no separate internal ID layer.
- **Google Cloud Console setup**: OAuth 2.0 Client ID (Web application type), Authorized redirect URI = Supabase's callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`, found via Supabase Dashboard → Authentication → Providers → Google → Callback URL field). For local CLI dev, also register `http://127.0.0.1:54321/auth/v1/callback`.
- **RLS**: left **off** on all app tables. FastAPI is the sole gatekeeper to Postgres (not the Supabase client SDK talking to Postgres directly, which is the usual Supabase pattern) — access control is enforced entirely in the API layer, not via Postgres row-level policies. Flag this explicitly to Claude Code since it deviates from most Supabase tutorials.

---

## 4. Database Connection

- Using **Supabase's hosted Postgres** directly (not local Docker) — the whole team migrates against one shared instance.
- Free plan constraint: the **direct connection** (`db.<project-ref>.supabase.co:5432`) is **IPv6-only**; the IPv4 add-on is Pro-plan-and-above only. Use the **Session Pooler** connection string instead (IPv4-compatible on all plans, safe for Alembic migrations — unlike the Transaction Pooler on port 6543, which has prepared-statement quirks that can break migration tools).
- Connection string location: **"Connect" button at the top of the Supabase project dashboard** (not under Project Settings → Database, which is outdated guidance).
- Format: `postgresql+psycopg://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`
- **Coordination rule (2-person team, shared DB)**: only one person runs `alembic upgrade head` at a time; pull latest `alembic/versions/` before generating a new migration to avoid conflicting revision files.

---

## 5. Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | **Mirrors Supabase Auth's user UUID** — not a separately generated ID |
| username | string | |
| email | string | |
| sex | enum | needed for strength-standard/scoring context |
| bodyweight_kg | decimal | |
| created_at | timestamp | |

### `gyms`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | string | |
| city | string | |
| join_code | string | for QR/code-based join flow |
| brand_color | string | for the branded public leaderboard page (future) |
| created_at | timestamp | |

**No `owner_id` column.** Ownership is modeled via `memberships.role = admin` — a deliberate simplification (adopted from a teammate's draft schema) so there isn't a separate "owner" concept alongside "admin role," and an owner who never logs a lift just needs a membership row with zero associated `logged_sets`.

### `memberships`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| gym_id | uuid FK → gyms | |
| role | enum (member / admin) | |
| joined_at | timestamp | |

### `exercises` (seeded reference data, curated list — not 400+)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | string | |
| type | enum (weighted / bodyweight) | determines which normalization path applies |
| muscle_group | enum (push / pull / legs / core / full_body) | drives the "what are you training today" onboarding flow |
| weight_coefficient | decimal | fixed difficulty/importance multiplier — squat/bench/deadlift weighted higher than an accessory movement |
| weekly_eligible | bool | whether this exercise appears on the weekly champion board (SBD-focused) |

### `logged_sets` (raw input + server-computed fields)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| gym_id | uuid FK → gyms | |
| exercise_id | uuid FK → exercises | |
| weight_kg | decimal | client-submitted |
| reps | int | client-submitted, capped ~12 (Epley reliability range) |
| added_weight_kg | decimal | for weighted pull-ups/dips |
| bodyweight_at_log_kg | decimal | **snapshotted at log time**, not looked up live — protects historical lifts from being rescored if the user's bodyweight changes later |
| estimated_1rm_kg | decimal | server-computed via Epley formula |
| relative_ratio | decimal | server-computed, bodyweight-normalized (allometric scaling) |
| points | decimal | server-computed: `relative_ratio × exercise.weight_coefficient` |
| verified | bool | placeholder for future lift-verification (video/staff), borrowed from teammate's draft schema, defaults false, no verification flow built yet |
| logged_at | timestamp | |
| client_request_id | uuid | idempotency key — a retried request from a flaky connection must not create a duplicate |

### `tier_thresholds` (global, fixed — NOT per-exercise, NOT per-user)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| min_points | int | cumulative progression-bar points required |
| tier | enum (Bronze / Silver / Gold / Platinum / Diamond / Olympian) | |
| sub_level | int | e.g. Bronze 3 / Bronze 2 / Bronze 1, ... Platinum 1 |

This table is **not scoped to a user or a gym** — the same point thresholds apply to everyone. This is what keeps tier "personal" in outcome (driven only by the user's own points) while still being a fixed, non-relative yardstick (unlike gym rank, which is genuinely relative to other users).

### `weekly_exercise_bests` (materialized/precomputed — NOT written to directly by users)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| gym_id | uuid FK → gyms | |
| exercise_id | uuid FK → exercises | |
| user_id | uuid FK → users | |
| week_start | date | hard reset weekly — board goes empty each Monday |
| weight_kg | decimal | **raw weight**, not normalized ratio — bragging-rights framing, distinct from the fairness-oriented tier system |
| estimated_1rm_kg | decimal | |

Populated by a nightly batch job (or on-write check, deferred) reading from `logged_sets` — never queried live against raw `logged_sets` at request time.

### Gym leaderboard (top 10/20) — **no dedicated table**
Computed at read time (or cached later): `SUM(MAX(points) per exercise) GROUP BY user_id WHERE gym_id = X`, sorted descending, top N taken. The "N" should be dynamic (`min(20, total_ranked_members)`), not hardcoded, since early-stage gyms may have fewer than 10 members.

---

## 6. Scoring Engine — Formulas

1. **1RM estimation (Epley formula)**, capped at ~10–12 reps for reliability:
   `estimated_1rm_kg = weight_kg × (1 + reps / 30)`

2. **Bodyweight normalization (allometric scaling)** for weighted lifts:
   `relative_ratio = estimated_1rm_kg / bodyweight_kg^0.67`

   For bodyweight exercises (push-ups, pull-ups, dips): treat `bodyweight_kg + added_weight_kg` as the effective load, run through Epley, then express as `estimated_1rm / bodyweight_kg` to get a comparable relative-strength ratio without a separate formula per bodyweight exercise.

3. **Points per lift**:
   `points = relative_ratio × exercise.weight_coefficient`

4. **Progression bar (the single cumulative score per user)**:
   `bar_total = Σ over exercises of MAX(points) ever achieved for that exercise`

   **Critical rule — PR-based, not cumulative logging volume**: the bar only moves when a *new* log beats the existing best for that specific exercise. A lower or equal lift is still stored (for history) but does not change the bar. This prevents "spam-logging the same weight" from inflating rank.

5. **First-time onboarding**: a user's first logged set per exercise becomes their initial best for that exercise — there is no "start everyone at zero" period. Someone with real lifting experience should land at their appropriate tier/rank immediately after entering their bodyweight and current lifts, not have to re-earn it from scratch.

---

### 6.1 Exercise `weight_coefficient` — seed values

Rather than guessing these arbitrarily, they're grounded in the **NSCA's standard exercise classification** (used broadly in strength & conditioning program design), which sorts exercises into three tiers by joint involvement and muscle mass recruited:

- **Structural (axial-loaded, multi-joint)** — the spine is directly loaded and the movement recruits the most muscle mass across the most joints. Squat and deadlift are the canonical examples.
- **Core / non-structural (multi-joint, no direct spinal loading)** — still recruits multiple joints and large muscle groups, but the spine isn't axially loaded the way it is in a squat/deadlift. Bench press, overhead press, barbell row, and bodyweight compound movements (pull-ups, dips, push-ups) fall here.
- **Assistance (single-joint, isolation)** — recruits comparatively little muscle mass through one joint. Bicep curls, tricep extensions, leg extensions, calf raises.

This gives a defensible three-tier coefficient scale rather than an arbitrary one:

| Exercise | Type | NSCA Classification | `weight_coefficient` |
|---|---|---|---|
| Back Squat | weighted | Structural | 1.5 |
| Deadlift | weighted | Structural | 1.5 |
| Bench Press | weighted | Core (multi-joint) | 1.3 |
| Overhead Press | weighted | Core (multi-joint) | 1.3 |
| Barbell Row | weighted | Core (multi-joint) | 1.3 |
| Pull-up | bodyweight | Core (multi-joint) | 1.2 |
| Dip | bodyweight | Core (multi-joint) | 1.2 |
| Push-up | bodyweight | Core (multi-joint) | 1.2 |
| Bicep Curl | weighted | Assistance (isolation) | 1.0 |
| *(any other accessory/isolation movement added later)* | weighted or bodyweight | Assistance (isolation) | 1.0 |

**Rationale for the spread**: squat/deadlift sit at the top since they're both structural *and* the two lifts most commonly used as strength benchmarks; bench/OHP/row/pull-ups/dips/push-ups form a middle band since they're multi-joint compounds but don't load the spine axially the way squat/deadlift do; single-joint isolation work sits at the floor (1.0, i.e. no boost) since it recruits the least overall muscle mass. These are still starting values — Section 10 still applies for *tuning* them once real usage data exists — but they're no longer arbitrary placeholders, and they're enough for `scripts/seed.py` to run.

---

## 7. The Three Ranking Features (all derived from the same `bar_total`)

| # | Feature | Comparison basis | Scope | Notes |
|---|---|---|---|---|
| 1 | **League / Tier** | Fixed thresholds (`tier_thresholds`) | Personal | Never affected by other users. Sub-level progression (Bronze 3→2→1→Silver 3...) within each tier, driven by `bar_total` crossing fixed `min_points` cutoffs. This is what shows on a user's profile. |
| 2 | **Gym Rank** | Percentile / relative | Per gym | Same `bar_total` number, compared against other members at that gym instead of a fixed yardstick. Top 10 early-stage → top 20 later. Can shift even if the user didn't lift anything new, if others at the gym improve. |
| 3 | **Weekly Champion** | Raw weight, per exercise | Per gym, per exercise, per week | SBD-focused ("top squat/bench/deadlift this week"). Hard reset every Monday — board goes empty, not carried over as a standing target. Uses raw `weight_kg`, deliberately **not** the normalized ratio — this one is bragging-rights/screenshot-driven, fairness already lives in tier. |

**Key architectural point**: #1 and #2 are **computed at read time**, not stored — tier and gym rank are always derived fresh from `logged_sets` + `tier_thresholds`. Only #3 (`weekly_exercise_bests`) is a materialized table, because recomputing "best lift this week per exercise per gym" live doesn't scale the same way a simple lookup does.

---

## 8. Build Order — Phase 1 (Backend, Swagger-driven, no frontend)

**Step 0 — Foundations**
- Repo: two separate repos (`gym-app-backend`, `gym-app-frontend` reserved empty for now)
- `uv`/`poetry` + FastAPI, SQLAlchemy 2.0, Alembic, `psycopg[binary]`, `pydantic-settings`
- `.env` with Supabase Session Pooler `DATABASE_URL` + `SUPABASE_JWT_SECRET`; `.env.example` committed with placeholders
- Prove the absolute basics first: a `/health` endpoint that queries the DB, confirm it loads at `/docs`, before writing any real models

**Step 1 — Schema**
- SQLAlchemy models translated 1:1 from Section 5 above
- `alembic revision --autogenerate` → **review the diff manually** before applying (autogenerate can miss enum types/indexes) → `alembic upgrade head` against Supabase
- Seed script (`scripts/seed.py`) for `exercises` (curated list with `weight_coefficient` filled in — rough guesses are fine to start) and `tier_thresholds` (rough point bands — will need real-data tuning later)

**Step 2 — Auth wiring**
- JWT verification dependency (`get_current_user`) using `SUPABASE_JWT_SECRET`, HS256, extract `sub` → `users.id`
- Test via real tokens generated through Supabase (dashboard or `supabase-py`), or a `AUTH_DISABLED` dev-only flag that hard-fails if `ENV=production`

**Step 3 — CRUD only, no scoring yet**
- `users`, `gyms`, `memberships` (join by code), `exercises` (read-only), `logged_sets` (`POST` stores raw weight/reps/exercise only — no computed fields yet)

**Step 4 — Scoring engine, isolated and unit-tested**
- `services/scoring.py` as **pure functions**, no FastAPI involved — Epley, allometric scaling, points formula
- pytest coverage here is non-negotiable: this is the one place a silent bug corrupts every tier/leaderboard downstream. Test cases: sane ratio at different bodyweights, a 17.5kg PR correctly beating a 15kg prior best, etc.

**Step 5 — Wire scoring into the write path**
- `POST /logged-sets` now computes `estimated_1rm_kg`, `relative_ratio`, `points` server-side before storing

**Step 6 — Tier + leaderboard endpoints**
- `services/tiers.py`: sum best-per-exercise points, look up against `tier_thresholds` → `GET /users/{id}/tier`
- `GET /gyms/{id}/leaderboard`: percentile-ranked aggregate within a gym
- `GET /gyms/{id}/exercises/{exercise_id}/weekly-leaderboard`: reads from `weekly_exercise_bests`; start with a manually-triggerable population script/endpoint before building a real scheduler (APScheduler/cron) once the query logic is proven

**Step 7 — Manual validation before touching the frontend**
- Create 2–3 fake users via Swagger with different bodyweights, log a mix of PRs and non-PRs across several exercises
- Sanity-check by hand: does the bar only move on PRs? Does tier match expectations? Does gym rank reorder correctly when a new user joins?
- Export `/openapi.json` — becomes the contract for frontend generation; run through `openapi-typescript` to auto-generate TS types and avoid frontend/backend type drift

---

## 9. Deferred to Later Phases (explicitly out of scope for Phase 1)

- Social features (following, feed, comments)
- Gym claim/ownership verification flow beyond `role = admin`
- Streaks, XP/currency, cosmetics
- Actual lift verification (video/staff) — the `verified` boolean exists as a placeholder only
- Push notifications
- Branded public no-login gym leaderboard page (growth mechanic, borrowed from teammate's plan — good idea, later phase)
- Most-improved view (% change over a window) — borrowed from teammate's plan, good addition, not Phase 1
- Materialized `gym_rank_snapshots` table (if/when the live aggregate query gets slow)
- Sentry / PostHog monitoring, rate limiting — from teammate's plan, appropriate once real users are close

---

## 10. Open Items Still Worth Deciding

- `tier_thresholds` point bands (the actual `min_points` cutoffs for each tier/sub-level) — `weight_coefficient` values are now seeded (Section 6.1), but the tier ladder itself still needs concrete numbers before the seed script is fully runnable
- Whether gym rank eventually gets its own materialized/cached table (same pattern as `weekly_exercise_bests`) once query load justifies it
- Onboarding UX for entering initial lifts across multiple exercises before a first tier is shown (product/frontend decision, not schema)
