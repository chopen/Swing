# Momentum Relative Volatility Index (MRVI) — Technical Specification

## Overview

MRVI is an adaptation of Donald Dorsey's Relative Volatility Index (RVI) for basketball momentum analysis. While MVIX measures the **magnitude** of momentum volatility ("how volatile is this team?"), MRVI measures the **direction** of volatility ("is volatility expanding upward or downward?"). Together they form a complete volatility picture.

## Origin: Dorsey RVI

The Relative Volatility Index was introduced by Donald Dorsey in 1Mo Technical Analysis of Stocks & Commodities (1993). Unlike RSI which uses absolute price changes, RVI uses standard deviation to measure the direction of volatility itself. It was designed as a confirming indicator — not to generate signals alone, but to validate signals from other indicators.

**Key insight applied to basketball:** A team can have high volatility (MVIX) that is working in their favor (high MRVI) or against them (low MRVI). The combination tells you whether chaos is an asset or a liability for that team in the current game.

## Algorithm

### Input

Per-team momentum chart data: an array of data points, each with:
- `v` — normalized momentum value (5–95 scale)
- `p` — period number
- `c` — game clock display value

### Parameters

| Parameter | Default | Description |
|---|---|---|
| `STD_PERIOD` | 8 | Rolling window for standard deviation calculation |
| `SMOOTH_PERIOD` | 14 | Wilder's exponential smoothing period |

### Step 1: Rolling Standard Deviation

For each chart point `i` (where `i >= STD_PERIOD`), compute the rolling standard deviation of the last `STD_PERIOD` momentum values:

```
values = [v[i-STD_PERIOD+1], v[i-STD_PERIOD+2], ..., v[i]]
mean = sum(values) / STD_PERIOD
stddev[i] = sqrt(sum((v - mean)^2 for v in values) / STD_PERIOD)
```

### Step 2: Classify Direction

For each point, classify the standard deviation as "up volatility" or "down volatility" based on whether momentum is rising or falling:

```
if v[i] > v[i-1]:
    up_vol[i] = stddev[i]
    down_vol[i] = 0
elif v[i] < v[i-1]:
    up_vol[i] = 0
    down_vol[i] = stddev[i]
else:
    // Tie — split evenly or carry forward prior classification
    up_vol[i] = stddev[i] / 2
    down_vol[i] = stddev[i] / 2
```

### Step 3: Wilder's Exponential Smoothing

Apply Wilder's smoothing (same as RSI) to both up and down volatility series:

```
alpha = 1 / SMOOTH_PERIOD

smoothed_up[0] = up_vol[0]
smoothed_down[0] = down_vol[0]

For i > 0:
    smoothed_up[i] = alpha * up_vol[i] + (1 - alpha) * smoothed_up[i-1]
    smoothed_down[i] = alpha * down_vol[i] + (1 - alpha) * smoothed_down[i-1]
```

Wilder's smoothing was chosen over simple moving average because it:
- Reacts faster to regime changes (important in a 40-minute basketball game)
- Gives more weight to recent data
- Is the standard for RSI-family indicators

### Step 4: Compute MRVI

```
MRVI[i] = 100 * smoothed_up[i] / (smoothed_up[i] + smoothed_down[i])
```

If `smoothed_up[i] + smoothed_down[i] == 0`, MRVI defaults to 50 (neutral).

## Interpretation

### MRVI Scale (0–100)

| MRVI Range | Interpretation |
|---|---|
| 75–100 | Strong upward volatility regime — momentum surges dominating |
| 50–75 | Upward bias — momentum trending favorably |
| 50 | Neutral — volatility balanced in both directions |
| 25–50 | Downward bias — momentum drops dominating |
| 0–25 | Strong downward volatility regime — team in sustained momentum collapse |

### Signal Patterns

**Centerline Crossover (MRVI crossing 50):**
- Crossing above 50: Volatility regime shifting to favor the team — momentum surges are becoming larger/more frequent than drops
- Crossing below 50: Volatility regime shifting against the team — momentum is deteriorating

**Divergence:**
- Score rising but MRVI falling: The lead may be fragile — the team is winning on the scoreboard but their momentum dynamics are degrading
- Score falling but MRVI rising: Potential comeback — despite trailing, the team's momentum volatility is shifting in their favor

**Extreme Readings:**
- MRVI > 80: Strong positive regime, but may be unsustainable (like overbought RSI)
- MRVI < 20: Strong negative regime, but may be approaching a reversal point

## Combined MVIX + MRVI Framework

| MVIX | MRVI | Interpretation |
|---|---|---|
| Low (<30) | High (>60) | Calm and trending up — strongest position |
| Low (<30) | Low (<40) | Calm but trending down — controlled decline |
| High (>70) | High (>60) | Chaotic but momentum surges dominating — high-risk high-reward |
| High (>70) | Low (<40) | Chaotic and trending down — worst position, momentum collapse |
| Moderate | ~50 | Neutral — game is balanced, no clear volatility edge |

### Pre-Game Usage (Rolling MRVI)

Compute each team's average MRVI from their last N games:
- Rolling MRVI > 55: Team is in an upward volatility regime across recent games — their chaos tends to work in their favor
- Rolling MRVI < 45: Team is in a downward volatility regime — their volatility tends to hurt them
- Combined with rolling MVIX for full profile:
  - Low MVIX + High MRVI = controlled team trending up (best predictor per our research)
  - High MVIX + Low MRVI = volatile team trending down (worst profile)

### In-Game Usage

- Display MRVI as a real-time indicator on the game card
- Track centerline crossovers as potential momentum shift alerts
- Use MRVI divergence from score differential as a "fragile lead" or "hidden comeback" signal
- MRVI crossing below 30 could trigger a "momentum collapse" warning

## Relationship to Existing Alerts

MRVI can enhance the existing alert system:

| Existing Alert | MRVI Enhancement |
|---|---|
| **Bluffing** (score/momentum disagree) | MRVI direction confirms whether the disagreement is growing or resolving |
| **Comeback Watch** (trailing team leads momentum) | MRVI > 60 for trailing team = comeback gaining steam; MRVI falling = comeback fading |
| **Swing Warning** (close score, one-sided momentum) | MRVI trend shows if the momentum advantage is accelerating or stabilizing |

## Implementation Plan

### Phase 1: Core Computation
- Add `computeMRVI(chart, league)` function to `lib/mvix.js`
- Returns per-point MRVI series and current MRVI value
- Include in the analysis endpoint response

### Phase 2: Poll Integration
- Compute MRVI alongside MVIX in the poll route
- Attach `mrviAway` and `mrviHome` to game objects
- Store in `team_mvix` table (add `mrvi` column)

### Phase 3: Display
- Add MRVI to the game card (small gauge or number near MVIX meter)
- Include MRVI in chart click tooltips
- Color-code: green (>60), yellow (40-60), red (<40)

### Phase 4: Alerts
- MRVI centerline crossover as a new alert type
- Divergence detection (score vs MRVI direction mismatch)
- Combined MVIX+MRVI regime classification in analysis endpoint

## Validation Plan

Using the same 182-game NBA dataset from our MVIX analysis:

1. Compute per-game final MRVI for both teams
2. Test if lower/higher MRVI predicts winners (single game)
3. Compute rolling 3/5/7/10-game MRVI per team
4. Test rolling MRVI as a predictor
5. Test MVIX + MRVI combined as a predictor (e.g., low MVIX + high MRVI)
6. Compare prediction accuracy against MVIX alone, MRVI alone, and combined

### Expected Hypothesis

Based on Dorsey's original research and our MVIX findings:
- MRVI alone may be a moderate predictor (~55-60%)
- MRVI combined with MVIX should outperform either alone
- The strongest signal will be rolling low MVIX + rolling high MRVI (calm team with upward volatility trend)
- MRVI will be most valuable as an in-game indicator for detecting regime changes before they manifest in the score

## References

- Dorsey, D. (1993). "The Relative Volatility Index." Technical Analysis of Stocks & Commodities.
- Wilder, J.W. (1978). "New Concepts in Technical Trading Systems." — Wilder's smoothing method.
- The Swing MVIX Analysis (docs/MVIX-Analysis.md) — foundational volatility research this builds upon.
