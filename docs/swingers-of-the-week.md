# Swingers of the Week — API Specification

## Overview

A weekly award recognizing the top 3 momentum-shifting players per NCAA Division I conference. Computed from backfilled `player_swing_impact` data over a Monday–Sunday window.

## Endpoint

```
GET /api/analysis/swingers-of-the-week?date=YYYYMMDD&conference=ACC
```

### Query Parameters

| Parameter    | Required | Description                                                                 |
|-------------|----------|-----------------------------------------------------------------------------|
| `date`      | Yes      | Any date in `YYYYMMDD` format. The API resolves the Monday–Sunday week containing this date. |
| `conference`| No       | Conference name filter (e.g. `ACC`, `Big Ten`). Omit to return all conferences. |

### Week Resolution

- If the provided date is a Sunday, that Sunday is the end of the week.
- If it is any other day, the API finds the Monday–Sunday window the date falls within.
- Example: `date=20260318` (Wednesday) resolves to `2026-03-16` (Mon) through `2026-03-22` (Sun).

## Ranking Criteria

- **Metric**: Average `weightedImpact` per game within the week.
- **Why avg per game**: Players can't control how many games they play in a week. Average rewards impact quality over schedule volume.
- **Weighted impact**: Each player's possession score during a momentum swing is multiplied by the swing's magnitude. Bigger swings count more.
- **Minimum games**: 1 (no threshold). A single dominant performance qualifies. Games played is included in the response for context.
- **Scope**: NCAA Division I conferences only, CBB league.

## Response Shape

### All conferences (no `conference` param)

```json
{
  "week": {
    "start": "2026-03-16",
    "end": "2026-03-22"
  },
  "conferences": {
    "ACC": {
      "conferenceId": "2",
      "players": [
        {
          "player": "Player Name",
          "athleteId": "12345",
          "jersey": "23",
          "team": "DUKE",
          "gamesPlayed": 2,
          "avgWeightedImpact": 185.3,
          "totalWeightedImpact": 370.6,
          "avgEfficiency": 78.5,
          "clutchGames": 1
        }
      ]
    },
    "Big Ten": { ... },
    ...
  }
}
```

### Single conference (`?conference=ACC`)

Same shape, but `conferences` contains only the requested conference.

### Player fields

| Field                 | Description                                                              |
|----------------------|--------------------------------------------------------------------------|
| `player`             | Full display name                                                        |
| `athleteId`          | ESPN athlete ID                                                          |
| `jersey`             | Jersey number (if available)                                             |
| `team`               | Team abbreviation                                                        |
| `gamesPlayed`        | Number of games in the week window                                       |
| `avgWeightedImpact`  | Average magnitude-weighted impact per game (the ranking metric)          |
| `totalWeightedImpact`| Sum of weighted impact across all games in the week                      |
| `avgEfficiency`      | Average efficiency (positive plays / swing appearances) across the week  |
| `clutchGames`        | Number of games with clutch swing appearances (final 5 min, score within 12) |

## Data Pipeline

### 1. Store conference ID at record time

Add `conference_id` column to the `player_swing_impact` table. When recording swing impact during backfill or live polling, pass the `conferenceId` from ESPN's scoreboard event data.

### 2. Resolve conference names at response time

Fetch the conference ID-to-name mapping from ESPN's groups endpoint:

```
https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/groups
```

Cache the mapping in memory (conference names rarely change). Use it to label each conference in the response. Filter to NCAA Division I groups only.

### 3. Query

```sql
SELECT player_name, athlete_id, team, conference_id,
       COUNT(*) AS games_played,
       ROUND(AVG(weighted_impact)::numeric, 1) AS avg_weighted_impact,
       SUM(weighted_impact) AS total_weighted_impact,
       ROUND(AVG(efficiency)::numeric, 1) AS avg_efficiency,
       SUM(CASE WHEN clutch_appearances > 0 THEN 1 ELSE 0 END) AS clutch_games
FROM player_swing_impact
WHERE league = 'CBB'
  AND game_date BETWEEN $weekStart AND $weekEnd
  AND conference_id IS NOT NULL
GROUP BY player_name, athlete_id, team, conference_id
ORDER BY avg_weighted_impact DESC
```

Then partition by `conference_id` and take top 3 per conference.

## Schema Changes

### player_swing_impact — new columns

| Column              | Type        | Description                                     |
|--------------------|-------------|-------------------------------------------------|
| `conference_id`    | VARCHAR(10) | ESPN conference ID (e.g. "2" for ACC)           |
| `weighted_impact`  | REAL        | Magnitude-weighted impact (already computed, not yet stored) |
| `clutch_appearances` | INTEGER   | Clutch swing plays (already computed, not yet stored) |

These fields are already computed by `computeSwingImpact` but not persisted to the DB. This feature requires storing them.
