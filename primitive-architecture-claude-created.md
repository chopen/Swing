# The Swing — Architecture

The Swing is a **single-page, zero-build, self-contained web app** — everything lives in one HTML file with no framework, no bundler, and no backend.

## Structure

```
index.html (34KB)
├── CSS (inline <style>)          — all styling, responsive grid, animations
├── HTML (static shell)           — header, filter bar, empty <main> container
└── JS  (inline <script>)        — entire app logic
    ├── Momentum Engine           — core algorithm
    ├── Data Layer                — ESPN API fetching
    ├── Alert Detection           — three-tier bluff/comeback/warning system
    ├── Renderer                  — DOM construction (string-based, no virtual DOM)
    └── Boot / Refresh Loop       — 20-second polling cycle
```

## Data Flow

```
ESPN Public API (no auth)
    ├── /scoreboard (NBA)        → game metadata, scores, status
    ├── /scoreboard (CBB)        → same for NCAA
    └── /summary?event={id}      → play-by-play arrays for live/final games
         │
         ▼
    parseScoreboard()            → normalize into game objects (teams, scores, colors, IDs)
         │
         ▼
    computeMomentumFromPlays()   → sliding window of 12 events, weighted scoring
         │                         maps raw [-15, +15] → [0, 100] per team
         │                         produces: momentum values, sparkline chart data, recent plays
         ▼
    detectAlerts()               → compares score leader vs momentum leader
         │                         three tiers: BLUFFING > COMEBACK > SWING WARNING
         │                         halftime-aware thresholds (tighter with full half of data)
         ▼
    render()                     → builds HTML string, sets innerHTML on <main>
         │                         sections: LIVE → UPCOMING → FINAL
         │                         each game card: score, momentum bars, sparkline, alerts, play feed
         ▼
    wireFeedToggles()            → attaches click handlers for collapsible play feeds
                                   preserves open/closed state across re-renders via openFeeds Set
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

- **No backend** — pulls directly from ESPN's public, unauthenticated API endpoints from the browser
- **Independent momentum** — each team's score is computed from its own plays, not relative to the opponent
- **Halftime freeze** — reuses cached momentum during halftime instead of re-fetching (no new plays = no recompute)
- **Chart history preservation** — if a refresh returns fewer data points, the previous chart data is kept
- **Team ID resolution** — NBA uses abbreviations, NCAA uses numeric IDs; `resolveTeam()` handles both
- **String-based rendering** — no virtual DOM; `render()` builds an HTML string and sets `innerHTML` on each 20-second tick
- **State preservation across re-renders** — `openFeeds` Set tracks which play feed panels are expanded so they survive DOM rebuilds

## Data Sources

All data is pulled from ESPN's public (unauthenticated) API endpoints:

| Endpoint | Purpose |
|----------|---------|
| `site.api.espn.com/.../nba/scoreboard` | NBA game list, scores, status |
| `site.api.espn.com/.../mens-college-basketball/scoreboard` | NCAA game list, scores, status |
| `site.api.espn.com/.../summary?event={id}` | Play-by-play data for a specific game |

No API key required. Data refreshes every 20 seconds automatically. Cache-busting is handled via a `_t` timestamp query parameter.

## Supporting Files

| File | Purpose |
|------|---------|
| `serve.py` | Python HTTP server with CORS headers (ESPN API needs HTTP, not `file://`) |
| `docs/the_swing_overview.js` | Node.js script using `docx` library to generate a branded Word document with product overview, algorithm explanation, and findings |

## Limitations

- **Basketball only** — the algorithm is validated on NBA and NCAA D1 men's basketball; event weights would need re-validation for other sports
- **ESPN dependency** — relies entirely on ESPN's public API; no fallback data source
- **No persistence** — momentum history resets on page refresh; no database or local storage
- **No authentication** — no user accounts, saved preferences, or personalization
- **Client-side only** — all API calls happen from the browser, which limits scalability and exposes API usage patterns
