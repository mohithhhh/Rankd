# RankD frontend: UI and functionality redesign

Status: design for the builder. Nothing here is built yet. Written from a read of the current frontend, `openapi.json`, `scripts/seed.py` and `RankD_plan.md`. The user asked for this in place of a question round, so items marked **(my call)** are unconfirmed defaults.

## Why

The app feels dead for two reasons, both visible in the code.

**1. The core loop doesn't exist.** The tab bar and dashboard link to `/log`, `/history` and `/profile`, and the weekly card links to `/gyms/[gymId]/exercises/[exerciseId]/weekly`. None of those pages exist, so they 404. A user can sign up and join a gym but cannot log a lift, which is the only thing the product is for. Everything else (tier, gym rank, weekly champion) derives from logged sets, so with no way to log, every screen is empty.

**2. It looks like an unstyled template.**
- White page, default Geist, default shadcn cards and tables.
- All six tier colors in `globals.css` are `color-mix` blends of the same blue palette, so Bronze, Silver, Gold and Platinum are hard to tell apart. Tier is the product's identity and currently has none.
- No progress, no motion, no moment of reward.
- `TierSummary` shows a badge and a bare number. Its own comment says the progress bar was skipped because the backend exposes no thresholds.

## Goals

- A user can log a lift in under 15 seconds on a phone and immediately see what it did to their score and tier.
- Rank feels like a game: strong tier identity, visible progress toward the next sub-level, a reward moment on a PR or tier-up.
- Every link in the nav goes somewhere real.
- The app looks designed and populated on a phone, which is where it is used (between sets).

## Non-goals

Per plan section 9: social features, streaks and XP, lift verification, push notifications, the public branded leaderboard, most-improved view. No light/dark toggle in v1. No changes to scoring or schema.

## Anti-goals

- Don't hand-edit `lib/api/schema.d.ts`, and don't call the API from client components (all calls stay server-side; see `CLAUDE.md`).
- Don't invent score logic client-side. Points, 1RM and ratio come from the API response.
- Don't hardcode tier thresholds in the frontend. Fetch them (see backend change below).
- Don't add a component library or animation library. `tw-animate-css`, CSS transitions and `@keyframes` are enough.

## Backend changes (small, needed by the UI)

1. **`GET /tiers/thresholds`** returning the `tier_thresholds` rows ordered by `min_points` (`min_points`, `tier`, `sub_level`). Authenticated like everything else. This one endpoint gives the frontend (a) the progress bar toward the next sub-level, and (b) a tier badge on every leaderboard row, because `GymLeaderboardEntry` only carries `bar_total`. **(my call: a new endpoint rather than extending `TierOut`, since leaderboard rows need it too.)**
2. Optional: return `join_code` to admins on `GET /gyms/{id}` so a gym admin can share the code after creation. Today it is only in `GymCreatedOut`. Skip if it grows the task.

After adding either, refresh `gym-app-backend/openapi.json` (dump `app.openapi()`) and run `npm run gen:api-types`. Add a one-line test for the thresholds endpoint's ordering if the repo's test setup makes that cheap; otherwise skip.

## Visual direction

**Dark-first "ranked ladder" feel (my call).** Think competitive-game profile, not fitness-tracker pastel.

- **Surface:** near-black navy derived from the existing ink `#293241` (roughly `#0b0f17` base, `#121826` cards, `#1b2336` raised), with 1px hairline borders. Keep `#ee6c4d` as the single brand/CTA accent. Keep `#3d5a80` and `#98c1d9` only as muted info tones.
- **Tier palette: replace the blue-derived scale** with clearly distinct metals (bronze, silver, gold, platinum, diamond, olympian). Each tier gets a color, a soft glow (`box-shadow`), and a gradient for the large emblem. Verify contrast of text on each.
- **Type:** keep Geist for body. Add one display face via `next/font` (condensed or geometric, e.g. Barlow Condensed or Space Grotesk) for numbers, tier names and page titles. All numerics use `tabular-nums`.
- **Shape:** generous radius on cards (`rounded-2xl`), pill badges, big touch targets (min 44px).
- **Motion (CSS only):** count-up on score, progress bar fill, a tier-up burst, row highlight on your own entry. Everything respects `prefers-reduced-motion`.
- **Layout:** mobile-first single column; `max-w-5xl` two-column on desktop. The bottom tab bar stays on mobile and the Log tab becomes a raised center button.
- The `frontend-design` skill should be loaded before styling to avoid templated output.

## Screens

### Dashboard (`/dashboard`) — rework
- **Hero tier card:** large emblem (tier + sub-level), `bar_total` counting up, and a progress bar to the next sub-level using thresholds ("4.2 pts to Silver 3"). At the top tier, show "Max tier".
- **Primary CTA:** "Log a lift" button, always visible.
- **Muscle-group strength:** five small bars (push, pull, legs, core, full body) built from `/logged-sets/me`, showing the best points per group. Groups with no logs show "Not trained" (they contribute nothing, per the scoring rules). Computation is display-only grouping of API-returned `points`.
- **Your gym rank:** one-line "#3 of 12, top 25%" from the leaderboard entry for the current user, plus the top 3 as a mini podium.
- **Weekly champions:** one tile per `weekly_eligible` exercise (Bench Press, Deadlift, Back Squat), showing the holder and kg, linking to the weekly page. Empty state is an invitation ("Be the first to claim Bench this week").
- Gym switcher stays.

### Log a lift (`/log`) — new, the main feature
A workout-session flow, built as one client component with a server action for submit.
1. **Pick a muscle group** (push, pull, legs, core, full body) as large tiles. This matches the product plan's onboarding ("what are you training today"). Selecting it filters the exercise list from `/exercises`.
2. **Pick an exercise** (searchable list; weekly-eligible lifts marked).
3. **Enter sets:** weight (kg) and reps with big steppers and quick increments (±2.5 kg). For `bodyweight` exercises the weight field becomes "added weight (optional)" and sends `added_weight_kg`. Reps are validated against the backend's limit (check `logged_sets.py` for the cap, plan says about 12).
4. Sets accumulate in a session list on the page (editable and removable before submit). Adding another exercise is one tap.
5. **Submit** with `POST /logged-sets/bulk`. Each item gets a fresh `crypto.randomUUID()` as `client_request_id`, kept stable across retries so the backend's idempotency works. Gym comes from the active gym (switchable at the top).
6. **Result sheet:** fetch tier before submit and after, then show points earned per set, the `bar_total` delta, and a **PR badge** on any set whose `points` exceeds the previous best for that exercise (derive from `/logged-sets/me` fetched before submit; the API has no PR flag). If the sub-level or tier changed, play the tier-up moment. If nothing moved, say so plainly ("Logged. Your Bench best is still 87.5 kg").

### Ranks (`/gyms/[gymId]/leaderboard`) — rework
- Top-3 podium, then rows with rank, initials avatar, username, tier badge (from thresholds), `bar_total`, and percentile. Your row is pinned and highlighted even when outside the top 20.
- A tab strip switches between **Overall** and **Weekly** (links to the weekly page).
- Gym header with name and city.

### Weekly (`/gyms/[gymId]/exercises/[exerciseId]/weekly`) — new
- Exercise tabs for the weekly-eligible lifts. List of rank, username, `weight_kg` (raw weight, the headline) and `estimated_1rm_kg` (secondary). Header says "Resets Monday". Empty state invites a first lift.

### History (`/history`) — new
- `/logged-sets/me` grouped by day, newest first. Each set shows exercise, weight × reps, points, with PR markers where the set was the best-ever at the time (computed client-side from the same list, ordered by `logged_at`). Filter chips by muscle group. Empty state links to Log.

### Profile (`/profile`) — new
- Username, email, sex, bodyweight, with an edit form for username and bodyweight via `PATCH /users/me`. A note that bodyweight changes don't rescore past lifts (the backend snapshots it).
- Current tier card, gyms list with role badge, join/create another gym link, and sign out (move the sign-out button here from the header).

### Login, onboarding, join gym — restyle only
Same flows and routes, new look: dark surfaces, brand mark, tier-ladder art on login. Onboarding stays username, sex, bodyweight. Add a one-line explanation of why bodyweight matters ("scores are normalized so lighter lifters compete fairly"). No functional change.

### Shell
- Remove the header's sign-out button and username; keep a slim top bar with the brand and the gym switcher.
- Tab bar: Home, Ranks, **Log** (raised, center), History, Profile. Active state clearly distinguishable.
- Add `loading.tsx` skeletons for dashboard, ranks and history, and a friendly `not-found.tsx` and `error.tsx`.

## Demo data

An empty database makes any UI look dead. Add `gym-app-backend/scripts/seed_demo.py` that creates about 8 fake users with different bodyweights in one gym and logs a spread of sets through the real write path (so scores are genuine), then runs the weekly refresh. Idempotent (fixed UUIDs and `client_request_id`s). Runs against a dev database only; refuse to run when `ENV=production`.

## Builder guidance

- Read `gym-app-frontend/AGENTS.md` and the relevant `node_modules/next/dist/docs/` pages first; this Next.js version differs from older releases (e.g. `proxy.ts`, async `params` and `searchParams`).
- Reuse what exists: `requireOnboardedUser`, `lib/api/resources.ts`, `components/rankd/*`, shadcn primitives in `components/ui/`. New pages under `app/(app)/` inherit the guard from the layout.
- Mutations are Server Actions that call the typed `api` client, following `app/login/actions.ts` and `app/onboarding/actions.ts`.
- Verify before claiming done: `npm run lint`, `npm run build`, then run the backend with `AUTH_DISABLED=true`, seed demo data, and check every screen in a phone-width browser (`browser-automation` skill), including the log flow end to end and the empty states.

## Left to the builder

Exact hex values and the display font choice (within the direction above), component breakdown, animation details, copy, and whether the thresholds fetch is cached per request.

## Calls I made (check these)

1. Dark-first, no light mode in v1.
2. New `GET /tiers/thresholds` endpoint rather than extending `TierOut`.
3. Replace the blue-derived tier colors with distinct metals.
4. PR detection computed client-side from `/logged-sets/me`.
5. Demo seed script included in scope.
6. Skipped the independent builder-check review of this document to keep it quick.
