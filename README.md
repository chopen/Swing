# The Swing · Live P-B-P Momentum Dashboard

Real-time NBA + NCAA basketball momentum tracker. Computes possession-level momentum from live ESPN play-by-play data — independent of score.

---

## What It Does

- Pulls live scores + play-by-play from ESPN's public API every 20 seconds
- Computes a 0–100 momentum score per team from a sliding window of the last 12 possession events
- Shows sparkline momentum charts, live play feeds, and three alert tiers:
  - ⚡ **SCORE IS BLUFFING** — score and momentum leaders disagree
  - 👀 **COMEBACK WATCH** — trailing team dominates momentum
  - ⚠️ **SWING WARNING** — tied/close score but momentum is heavily one-sided

---

## Running Locally

> **Important:** The ESPN API requires the page to be served over HTTP, not opened as a `file://` URL. Opening `index.html` directly will result in CORS errors and no data loading.

### Option 1 — Python (easiest, no install required)

```bash
python3 serve.py
```

Or manually:

```bash
python3 -m http.server 8000
```

Then open: [http://localhost:8000](http://localhost:8000)

### Option 2 — Node.js

```bash
npx serve .
```

Then open the URL it gives you (usually `http://localhost:3000`).

### Option 3 — VS Code Live Server

Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer), right-click `index.html` → **Open with Live Server**.

---

## Running on GitHub Pages

1. Push this folder to a GitHub repo
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)` folder
4. GitHub will give you a URL like `https://yourusername.github.io/Swing/`

The dashboard will work live at that URL with no server needed — GitHub Pages serves over HTTPS which satisfies the CORS requirement.

---

## Files

| File | Description |
|------|-------------|
| `index.html` | The full dashboard — all HTML, CSS, and JS in one self-contained file |
| `serve.py` | Convenience script to launch a local server |
| `docs/the_swing_overview.js` | Product overview document generator (Node.js + docx) |
| `README.md` | This file |

---

## How The Momentum Algorithm Works

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

The raw window sum (range −15 to +15) is mapped to a 0–100 scale. Each team's momentum is computed **independently** — momentum is a measure of process, not outcome.

**Halftime freeze:** momentum is locked at the final possession of the first half and held stable during the halftime break. It resumes updating when the second half begins.

---

## Alert Tiers

1. **⚡ SCORE IS BLUFFING** — The team leading on the scoreboard is NOT the team leading in momentum. The score doesn't reflect how the game is actually being played.

2. **👀 COMEBACK WATCH** — The trailing team (by score) has dominant momentum. A run may be coming.

3. **⚠️ SWING WARNING** — The score is close/tied, but one team has overwhelming momentum. The game may break open.

At halftime, detection thresholds tighten because a full half of data provides a more reliable signal.

---

## Data Source

All data is pulled from ESPN's public (unauthenticated) API endpoints:
- `site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`
- `site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard`
- `site.api.espn.com/apis/site/v2/sports/basketball/{league}/summary?event={id}`

No API key required. Data refreshes every 20 seconds automatically.

---

## Notes

- **Basketball only.** The algorithm is validated on NBA and NCAA D1 men's basketball. Do not apply to other sports without re-validating signal weights.
- **CBB play attribution:** NCAA play-by-play data uses numeric team IDs rather than abbreviations. The algorithm resolves team identity via ID lookup from the scoreboard.
- **Best viewed at full browser width** — cards are designed for a 3-column grid layout.
