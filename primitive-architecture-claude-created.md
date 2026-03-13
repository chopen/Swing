# The Swing — Architecture

The Swing is a **full-stack Next.js application** that computes real-time basketball momentum from ESPN play-by-play data, persists results in SQLite, and serves them via API routes. Deployed on Vercel.

## Structure

```
app/                              Next.js application (App Router)
├── app/
│   ├── page.js                   Dashboard UI (React + Tailwind CSS)
│   ├── layout.js                 Root layout
│   ├── globals.css               Tailwind imports
│   └── api/                      Server-side API routes
│       ├── games/route.js        GET /api/games — list with filters
│       ├── games/[gameId]/
│       │   ├── route.js          GET /api/games/:id — detail
│       │   ├── momentum/route.js GET — full momentum timeline
│       │   ├── plays/route.js    GET — play-by-play with scores
│       │   └── alerts/route.js   GET — alerts for this game
│       ├── live/route.js         GET /api/live — live games with momentum
│       ├── alerts/route.js       GET /api/alerts — recent alerts
│       └── stats/alerts/route.js GET /api/stats/alerts — backfill accuracy
├── lib/                          Shared backend logic (Node.js)
│   ├── config.js                 Constants, weights, thresholds, ESPN URLs
│   ├── momentum.js               Momentum engine (sliding window algorithm)
│   ├── alerts.js                 Three-tier alert detection
│   ├── espn.js                   ESPN API client (fetch + parse)
│   └── db.js                     SQLite schema, connection, helpers
├── scripts/                      CLI tools
│   ├── backfill.js               Historical game backfill from ESPN
│   └── analysis.js               Post-backfill accuracy reporting
├── vercel.json                   Deployment config
└── package.json                  Dependencies and npm scripts

index.html                        Original standalone prototype (archived reference)
archive/python-backend/            Archived Python implementation (reference only)
```

## Data Flow

```
ESPN Public API (no auth)
    ├── /scoreboard (NBA)        → game metadata, scores, status
    ├── /scoreboard (CBB)        → same for NCAA
    └── /summary?event={id}      → play-by-play arrays for live/final games
         │
         ▼
    espn.js                      → fetch + parse scoreboard events
         │                         normalize into game objects (teams, scores, colors, IDs)
         │                         resolve team identity (ID for NCAA, abbreviation for NBA)
         ▼
    momentum.js                  → sliding window of 12 events, weighted scoring
         │                         maps raw [-15, +15] → [0, 100] per team
         │                         produces: momentum values, chart data, recent plays
         ▼
    alerts.js                    → compares score leader vs momentum leader
         │                         three tiers: BLUFFING > COMEBACK > SWING WARNING
         │                         halftime-aware thresholds (tighter with full half of data)
         ▼
    db.js (SQLite)               → persists games, plays, momentum snapshots, alerts
         │                         WAL mode for concurrent read/write
         ▼
    Next.js API routes           → serve data as JSON to frontend
         │
         ▼
    React components             → render dashboard with Tailwind CSS
```

## Momentum Engine

Each team gets a rolling window of their last **12 possession-level events**, scored as:

| Event | Score |
|-------|-------|
| Makes 3-pointer | +3.0 |
| Misses 3-pointer | −1.2 |
| Makes 2-pointer | +2.0 |
| Misses 2-pointer | −0.8 |
| Makes free throw | +0.8 |
| Misses free throw | −0.4 |
| Turnover | −2.5 |
| Steal | +1.8 |
| Block | +1.2 |
| Offensive rebound | +1.5 |
| Defensive rebound | +0.6 |
| Fast break | +2.5 |

The raw window sum (range −15 to +15) is mapped to a 0–100 scale via `toMomentum()`. Each team's momentum is computed **independently** — momentum is a measure of process, not outcome.

## Alert Detection (Three Tiers)

| Tier | Name | Condition |
|------|------|-----------|
| 1 | ⚡ SCORE IS BLUFFING | Score leader ≠ momentum leader, with sufficient gap in both |
| 2 | 👀 COMEBACK WATCH | Trailing team (by score) dominates momentum |
| 3 | ⚠️ SWING WARNING | Score is close/tied but momentum is heavily one-sided (gap ≥ 35) |

Tiers are mutually exclusive and evaluated in priority order: bluffing > comeback > swing warning.

At halftime, detection thresholds tighten because a full half of data provides a more reliable signal:

| Threshold | In-Game | Halftime |
|-----------|---------|----------|
| Bluff momentum gap | ≥ 10 | ≥ 4 |
| Bluff score gap | ≥ 4 | ≥ 2 |
| Comeback momentum lead | > 6 | > 4 |
| Comeback score gap | ≥ 5 | ≥ 3 |

## Key Design Decisions

- **Server-side computation** — momentum and alerts are computed in Node.js API routes, not in the browser; ESPN data is fetched server-side
- **SQLite persistence** — games, plays, momentum snapshots, and alerts are stored in a local SQLite database (better-sqlite3 with WAL mode)
- **Independent momentum** — each team's score is computed from its own plays, not relative to the opponent
- **Halftime freeze** — reuses cached momentum during halftime instead of re-fetching (no new plays = no recompute)
- **Chart history preservation** — if a refresh returns fewer data points, the previous chart data is kept
- **Team ID resolution** — NBA uses abbreviations, NCAA uses numeric IDs; `resolveTeam()` handles both
- **Vercel deployment** — Next.js App Router with serverless API routes; auto-deploys from GitHub

## Data Sources

All data is pulled from ESPN's public (unauthenticated) API endpoints:

| Endpoint | Purpose |
|----------|---------|
| `site.api.espn.com/.../nba/scoreboard` | NBA game list, scores, status |
| `site.api.espn.com/.../mens-college-basketball/scoreboard` | NCAA game list, scores, status |
| `site.api.espn.com/.../summary?event={id}` | Play-by-play data for a specific game |

No API key required. Cache-busting is handled via a `_t` timestamp query parameter.

## Database Schema

| Table | Purpose |
|-------|---------|
| `games` | Game metadata: teams, scores, status, venue, broadcast |
| `plays` | Full play-by-play with possession scores per play |
| `momentum_snapshots` | Chart data: momentum values sampled every 5 plays |
| `game_momentum` | Final momentum values per game |
| `alerts` | Every alert detected with game state at time of detection |
| `backfill_log` | Per-game backfill summary with alert accuracy |

## Limitations

- **Basketball only** — the algorithm is validated on NBA and NCAA D1 men's basketball; event weights would need re-validation for other sports
- **ESPN dependency** — relies entirely on ESPN's public API; no fallback data source
- **Serverless constraints** — Vercel serverless functions have execution time limits; long-running polling requires the backfill CLI script run locally
