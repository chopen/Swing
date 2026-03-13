# The Swing — Detailed Prediction Methods and Algorithms

This document provides an exhaustive breakdown of every method, algorithm, threshold, and decision rule used by The Swing to compute real-time basketball momentum and generate predictive alerts.

---

## 1. Core Philosophy

The Swing measures **process, not outcome**. The score tells you who is winning; The Swing tells you who is *playing better right now*. Momentum is computed independently per team from their own possession-level events — it is not relative to the opponent. Two teams can both have high momentum simultaneously (e.g., a fast-paced, high-quality game) or both have low momentum (e.g., a sloppy, low-energy stretch).

The fundamental insight: when the score and momentum diverge, the score is "bluffing" — it does not reflect the true state of the game. This divergence is where betting and broadcasting value lives.

---

## 2. Data Ingestion

### 2.1 Source

All data comes from ESPN's public (unauthenticated) API, fetched **server-side** via Node.js (`app/lib/espn.js`). Two types of requests are made:

1. **Scoreboard requests** — retrieve the full slate of games for today
   - NBA: `site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`
   - NCAA: `site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates={YYYYMMDD}&groups=50&limit=200`

2. **Summary/detail requests** — retrieve play-by-play data for a specific game
   - `site.api.espn.com/apis/site/v2/sports/basketball/{league}/summary?event={gameId}`

### 2.2 Data Pipeline

- ESPN data is fetched server-side in Node.js (not from the browser)
- For each game that is **in progress**, at **halftime**, or **final** (with at least 2 periods played), a detail request fetches the play-by-play array
- Cache-busting is applied via a `_t={timestamp}` query parameter to prevent stale responses
- At halftime, the detail fetch is **skipped entirely** — the last computed momentum snapshot is reused (see Section 6)
- All results are persisted in SQLite (games, plays, momentum snapshots, alerts) for historical analysis
- The frontend reads from Next.js API routes (`/api/games`, `/api/live`, etc.), not ESPN directly
- Historical backfill is handled by a CLI script (`app/scripts/backfill.js`) that processes completed games from any date range

### 2.3 Play Object Structure

Each play from ESPN's API contains (relevant fields):

| Field | Description |
|-------|-------------|
| `text` | Human-readable description (e.g., "LeBron James makes 24-foot three point jumper") |
| `type.text` | Play category (e.g., "Turnover", "Steal", "Rebound") |
| `team.id` | Numeric team ID (used in NCAA) |
| `team.abbreviation` | Team abbreviation (used in NBA) |
| `shootingPlay` | Boolean — whether this is a shot attempt |
| `scoreValue` | Point value of the shot (1, 2, or 3) |
| `clock.displayValue` | Game clock at time of play |
| `period.number` | Which quarter/half the play occurred in |
| `homeScore` / `awayScore` | Running score at the time of this play |
| `wallclock` | Real-world timestamp |

### 2.4 Team Resolution

NBA and NCAA use different identification schemes in their play-by-play data:

- **NBA**: plays carry `team.abbreviation` (e.g., "LAL", "BOS")
- **NCAA**: plays carry `team.id` (a numeric string, e.g., "2305")

The `resolveTeam()` function handles both by checking `team.id` first (matching against the known away/home IDs from the scoreboard), then falling back to `team.abbreviation`. This ensures correct team attribution regardless of league.

---

## 3. The Momentum Engine

### 3.1 Event Classification and Weighting

Every play attributed to a team is classified and assigned a momentum score. The `scorePossession()` function evaluates each play using text parsing and structured fields:

#### Shooting Events

Detected via the `shootingPlay` boolean flag combined with `scoreValue`:

| Event | Detection | Weight | Rationale |
|-------|-----------|--------|-----------|
| Made 3-pointer | `shootingPlay=true`, `scoreValue=3`, text contains "makes" | **+3.0** | Highest-impact scoring play; energizes team, demoralizes opponent |
| Missed 3-pointer | `shootingPlay=true`, `scoreValue=3`, text contains "misses" | **−1.2** | Wasted possession on a low-percentage shot |
| Made 2-pointer | `shootingPlay=true`, `scoreValue=2`, text contains "makes" | **+2.0** | Solid scoring, indicates good offensive execution |
| Missed 2-pointer | `shootingPlay=true`, `scoreValue=2`, text contains "misses" | **−0.8** | Less costly miss than a 3-pointer (better shot selection implied) |
| Made free throw | `shootingPlay=true`, `scoreValue=1`, text contains "makes" | **+0.8** | Points scored but low-energy play; less momentum impact |
| Missed free throw | `shootingPlay=true`, `scoreValue=1`, text contains "misses" | **−0.4** | Minor negative; expected to make, but low drama |

#### Turnover Events

Detected via `type.text` containing "turnover" OR `text` containing "turnover", "bad pass", or "lost ball":

| Event | Weight | Rationale |
|-------|--------|-----------|
| Turnover | **−2.5** | Second-highest negative weight; turnovers kill momentum by giving up possession without a shot attempt |

#### Hustle / Defensive Events

Detected via `type.text` or `text` keyword matching:

| Event | Detection Keywords | Weight | Rationale |
|-------|-------------------|--------|-----------|
| Steal | "steal" | **+1.8** | High-energy defensive play; often leads to fast breaks |
| Block | "block" | **+1.2** | Momentum-swinging defensive play; energizes crowd |
| Offensive rebound | "rebound" + "offensive" | **+1.5** | Second-chance opportunity; signals effort and desire |
| Defensive rebound | "rebound" (not offensive) | **+0.6** | Expected outcome; minor positive for securing possession |

#### Special Events

| Event | Detection Keywords | Weight | Rationale |
|-------|-------------------|--------|-----------|
| Fast break | "fast break" or "fastbreak" | **+2.5** | Highest-energy play type; indicates pace and transition dominance |
| Foul | — | **−0.3** | Defined in weights but only applied when classified as such |

#### Weight Design Principles

- **Positive weights are larger than negative weights for the same event type** — making a shot is more momentum-building than missing one is momentum-killing. This reflects the psychological asymmetry: a made three generates more energy than a missed three drains.
- **High-effort plays (steals, offensive rebounds, fast breaks) carry outsized positive weight** — these are "process" indicators that show a team is competing harder than the score may reflect.
- **Turnovers are the most damaging single event (−2.5)** — giving away possession without even attempting a shot is the strongest signal of negative momentum.
- **Free throws are low-impact in both directions** — they pause the flow of the game and carry less emotional weight.

#### Score Accumulation

A single play can accumulate multiple weights. For example:
- A steal (+1.8) that leads to a fast break (+2.5) made layup (+2.0) could score **+6.3** for that play if all keywords appear in the play text
- A turnover (−2.5) that results from a steal gives −2.5 to the team that turned it over and +1.8 to the team that stole it (they appear as separate plays attributed to different teams)

#### Play Filtering

Not all plays enter the momentum calculation. A play is **skipped** if ALL of the following are true:
- Its computed score is 0
- It is not a shooting play (`shootingPlay` is false)
- Its type is not a rebound, turnover, or steal

This filters out non-momentum events like substitutions, end-of-period markers, and jump balls.

### 3.2 Sliding Window

The algorithm maintains a **separate sliding window for each team**, each holding the **last 12 scored events**.

```
Team A window: [+2.0, -0.8, +3.0, -2.5, +1.8, +0.6, -1.2, +2.0, +1.5, -0.8, +2.5, +3.0]
                ────────────────────── 12 events ──────────────────────
```

**Why 12?** This represents roughly the last 3-4 minutes of game action for a single team — long enough to capture a meaningful run, short enough to reflect *current* momentum rather than the entire game's history.

**Window mechanics:**
1. When a new scored event arrives for a team, it is pushed to the end of that team's window
2. If the window exceeds 12 entries, the oldest entry is removed (FIFO / shift)
3. The momentum score is the **sum** of all values in the window

**Independence:** Each team has its own window. Team A's momentum is computed solely from Team A's plays. Team B making a great play does not directly affect Team A's momentum number — it only affects Team B's. The comparison between the two teams' momentum values is what generates alerts.

### 3.3 Raw-to-Normalized Mapping

The raw window sum has a theoretical range of approximately **−15 to +15** (e.g., 12 turnovers at −2.5 = −30, but mixed realistic play caps closer to ±15).

The `toMomentum()` function maps this to a **0–100 scale** (actually 5–95 to avoid visual extremes):

```
toMomentum(raw):
    clamped = clamp(raw, -15, +15)
    return round(5 + ((clamped + 15) / 30) * 90)
```

| Raw Sum | Momentum Score | Interpretation |
|---------|---------------|----------------|
| −15 | 5 | Floor — worst possible momentum |
| −7.5 | 28 | Poor momentum |
| 0 | 50 | Neutral — neither positive nor negative |
| +7.5 | 73 | Strong momentum |
| +15 | 95 | Ceiling — best possible momentum |

A team at **50** is performing neutrally. Above 50 = positive momentum. Below 50 = negative momentum.

### 3.4 Chart Sampling

For the sparkline visualization, the algorithm samples the momentum state every **5 plays** (not every play, to avoid noise and keep chart data manageable). Each sample records:

- Momentum value (0-100)
- Game clock
- Period number
- Running score at that moment
- Wall clock timestamp

The chart is trimmed to a maximum of **60 data points** using even-interval downsampling:

```
if chart.length > 60:
    step = chart.length / 60
    chart = [chart[floor(i * step)] for i in 0..59]
```

This ensures consistent chart density regardless of how many plays have occurred.

---

## 4. Alert Detection System

### 4.1 Overview

The alert system runs `detectAlerts()` on every game after momentum is computed. It evaluates three mutually exclusive tiers in priority order:

```
Tier 1: SCORE IS BLUFFING    (highest priority)
Tier 2: COMEBACK WATCH
Tier 3: SWING WARNING         (lowest priority)
```

If a game qualifies for Tier 1, it will never show Tier 2 or 3 — even if those conditions are also met.

### 4.2 Input Values

```
swingGap   = |awayMomentum - homeMomentum|      // how far apart the two teams' momentum values are
scoreDiff  = awayScore - homeScore               // positive = away leads, negative = home leads
awayLeadsScore = scoreDiff > 0                   // boolean: does the away team lead on the scoreboard?
awayLeadsSwing = awayMomentum > homeMomentum     // boolean: does the away team lead in momentum?
```

### 4.3 Adaptive Thresholds

Thresholds tighten at halftime because a full half of data (roughly 100+ possessions per team) provides a more reliable signal than a few minutes of play:

| Parameter | In-Game Value | Halftime Value | Purpose |
|-----------|--------------|----------------|---------|
| `bluffMomThresh` | 10 | 4 | Minimum momentum gap for BLUFFING |
| `bluffScoreThresh` | 4 | 2 | Minimum score gap for BLUFFING |
| `comebackMomLead` | 6 | 4 | How much the trailing team must lead by in momentum for COMEBACK |
| `comebackScoreGap` | 5 | 3 | Minimum score deficit for COMEBACK to apply |

### 4.4 Tier 1: SCORE IS BLUFFING

**Meaning:** The team leading on the scoreboard is NOT the team with momentum. The score is misleading — the trailing team is actually playing better.

**Conditions (ALL must be true):**
1. Game is live (in progress or at halftime)
2. `swingGap >= bluffMomThresh` — momentum difference is significant (≥10 in-game, ≥4 at halftime)
3. `|scoreDiff| >= bluffScoreThresh` — score gap is meaningful (≥4 in-game, ≥2 at halftime)
4. `awayLeadsScore !== awayLeadsSwing` — the score leader and momentum leader are different teams

**Example:** Team A leads 72-65 (score gap = 7) but Team B has momentum 71 vs Team A's 42 (swing gap = 29). The score says Team A is winning; the momentum says Team B is playing better. Score is bluffing.

### 4.5 Tier 2: COMEBACK WATCH

**Meaning:** The team that is *behind* on the scoreboard has dominant momentum. A run may be coming.

**Conditions (ALL must be true):**
1. Game is live
2. NOT already classified as BLUFFING
3. `|scoreDiff| >= comebackScoreGap` — the team is actually trailing by a meaningful amount (≥5 in-game, ≥3 at halftime)
4. `trailingLeadsSwing` — the trailing team's momentum exceeds the leading team's momentum by more than `comebackMomLead` (>6 in-game, >4 at halftime)

**`trailingLeadsSwing` calculation:**
```
if scoreDiff > 0:   // away leads on scoreboard
    trailingLeadsSwing = homeMomentum > awayMomentum + comebackMomLead
else:               // home leads on scoreboard
    trailingLeadsSwing = awayMomentum > homeMomentum + comebackMomLead
```

The trailing team must not just edge out the leading team in momentum — they must dominate it by a clear margin.

**Example:** Team A leads 80-68 (score gap = 12) and Team B has momentum 74 vs Team A's 38. Team B trails by 12 points but has a 36-point momentum lead (well above the +6 threshold). Comeback Watch.

### 4.6 Tier 3: SWING WARNING

**Meaning:** The score is close or tied, so BLUFFING doesn't apply — but one team has overwhelming momentum. The game may be about to break open.

**Conditions (ALL must be true):**
1. Game is live
2. NOT classified as BLUFFING or COMEBACK
3. `|scoreDiff| < bluffScoreThresh` — score is close (<4 in-game, <2 at halftime)
4. `swingGap >= 35` — momentum gap is massive (35+ on the 0-100 scale)

**Example:** Score is tied 55-55, but Team A has momentum 78 vs Team B's 39 (swing gap = 39). The score looks like a toss-up, but one team is clearly playing better. Swing Warning.

### 4.7 Halftime Tagging

When any alert fires during halftime (`STATUS_HALFTIME`), the alert display appends a "FULL HALF OF DATA" indicator. This tells the user that the alert is based on an entire half of game data rather than a small in-game sample, increasing its reliability.

---

## 5. Momentum Independence and What It Means

The two momentum values are **not zero-sum**. Possible states include:

| Away Momentum | Home Momentum | Interpretation |
|--------------|---------------|----------------|
| High (75+) | Low (25−) | Away team dominating process |
| Low (25−) | High (75+) | Home team dominating process |
| High (75+) | High (75+) | Both teams playing well — high-quality, fast-paced stretch |
| Low (25−) | Low (25−) | Both teams playing poorly — sloppy, low-energy stretch |
| ~50 | ~50 | Neutral — neither team has distinct momentum |

This is a critical design choice. A tug-of-war model (one team's gain = other team's loss) would miss the "both teams playing well" and "both teams playing poorly" scenarios, which carry real information for bettors and broadcasters.

---

## 6. Halftime Freeze

When a game enters `STATUS_HALFTIME`:

1. The system **does not** re-fetch play-by-play data from ESPN
2. The momentum snapshot from the end of the first half is **carried forward unchanged**
3. Alert detection still runs against this frozen momentum (with tightened thresholds)
4. When the second half begins (`STATUS_IN_PROGRESS`), normal fetching and computation resumes

**Why:** No new plays occur during halftime. Re-fetching would waste API calls and return identical data. More importantly, the halftime break is a prime decision window for live bettors — showing stable, full-half momentum data during this window is more valuable than showing fluctuating re-computations of the same data.

---

## 7. Chart History Preservation

On each 20-second refresh cycle, the system compares the new chart data length against the previously stored chart data:

```
if previousChart.length > newChart.length:
    keep previousChart    // don't lose history
else:
    use newChart          // new data is more complete
```

This prevents chart regression when ESPN's API occasionally returns truncated play-by-play data on a given request.

---

## 8. What the Algorithm Does NOT Do

Understanding the boundaries is as important as understanding the methods:

- **Does not predict winners** — momentum measures current process quality, not game outcome probability
- **Does not account for player identity** — a LeBron James made three and a bench player's made three carry the same +3.0 weight
- **Does not account for game context** — garbage time, intentional fouling, clock management, and tanking motivations are invisible to the algorithm
- **Does not incorporate crowd noise** — although discussed as a future enhancement (decibel-based arena spike detection), the current version has no crowd/home-court factor
- **Does not use historical team data** — no season averages, no strength of schedule, no prior matchup history
- **Does not use betting lines** — the algorithm is independent of spreads, odds, and market sentiment
- **Does not decay over time** — old events within the 12-event window carry equal weight to recent ones; only the FIFO eviction provides implicit recency bias

---

## 9. Known Edge Cases and Limitations

### 9.1 Blowouts

In a blowout where the leading team rests starters and the trailing team scores garbage-time points, the trailing team's momentum will rise. The algorithm correctly identifies this momentum shift but cannot distinguish between a genuine comeback and garbage-time stat padding.

### 9.2 Free Throw Parades

Extended free throw sequences produce minimal momentum movement (±0.4 to ±0.8 per attempt). A team winning via free throws may show lower momentum than expected because free throws are low-energy events.

### 9.3 Hot 3-Point Shooting

A team hitting an unsustainable streak of 3-pointers will show very high momentum (+3.0 per make). The algorithm does not explicitly discount hot shooting — it relies on the natural window turnover (old makes fall off) and the likelihood of regression (future misses at −1.2).

### 9.4 Score Accumulation on Single Plays

Because scoring uses keyword matching on play text, a single play with rich description can accumulate multiple weights. For example, "Smith steals the ball and scores on a fast break layup" could score: steal (+1.8) + fast break (+2.5) + made 2 (+2.0) = **+6.3**. This is intentional — such plays genuinely carry outsized momentum impact.

### 9.5 NCAA Team Attribution

NCAA play-by-play data sometimes has inconsistent team attribution. The dual ID/abbreviation resolution system (`resolveTeam()`) mitigates this, but edge cases may exist where a play is attributed to the wrong team or not attributed at all.
