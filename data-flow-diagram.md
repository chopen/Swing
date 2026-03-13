# The Swing — Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ESPN PUBLIC API                                   │
│                         (no authentication)                                 │
└──────────┬──────────────────────┬───────────────────────────────────────────┘
           │                      │
           ▼                      ▼
┌─────────────────────┐ ┌─────────────────────────────────┐
│  NBA Scoreboard     │ │  NCAA Scoreboard                │
│  /nba/scoreboard    │ │  /mens-college-basketball/      │
│                     │ │  scoreboard?dates=YYYYMMDD      │
│  Returns:           │ │  &groups=50&limit=200           │
│  • All today's NBA  │ │                                 │
│    games            │ │  Returns:                       │
│  • Scores           │ │  • All today's NCAA D1 games    │
│  • Status           │ │  • Scores                       │
│  • Team metadata    │ │  • Status                       │
│  • Broadcast info   │ │  • Team metadata                │
└──────────┬──────────┘ └──────────┬──────────────────────┘
           │                       │
           └───────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │   loadScoreboards()    │
          │                        │
          │  Merges NBA + NCAA     │
          │  Tags each event with  │
          │  league: 'NBA'|'CBB'   │
          └────────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │  parseScoreboard()     │
          │  (per event)           │
          │                        │
          │  Extracts:             │
          │  • id, league, status  │
          │  • awayAbbr, homeAbbr  │
          │  • awayId, homeId      │
          │  • scores, colors      │
          │  • venue, broadcast    │
          │  • period, clock       │
          └────────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────────────────────────────────┐
          │              ROUTING DECISION                      │
          │                                                    │
          │  Is game STATUS_HALFTIME with existing momentum?   │
          │  ┌─── YES ──────────────────────────────────────┐  │
          │  │  HALFTIME FREEZE                             │  │
          │  │  Reuse previous momentum snapshot            │  │
          │  │  Skip detail fetch entirely                  │  │
          │  │  Jump directly to Alert Detection ─────────────────┐
          │  └──────────────────────────────────────────────┘  │  │
          │                                                    │  │
          │  Is game IN_PROGRESS, HALFTIME (first time),       │  │
          │  or FINAL (period ≥ 2)?                            │  │
          │  ┌─── YES ──────────────────────────────────────┐  │  │
          │  │  Fetch play-by-play detail                   │  │  │
          │  └──────────────────────────┬───────────────────┘  │  │
          │                             │                      │  │
          │  ┌─── NO (SCHEDULED) ────────────────────────────┐ │  │
          │  │  No momentum computed                        │ │  │
          │  │  Display "MOMENTUM ACTIVATES AT TIP-OFF"     │ │  │
          │  └──────────────────────────────────────────────┘ │  │
          └─────────────────────────────┬──────────────────────┘  │
                                        │                         │
                                        ▼                         │
                       ┌────────────────────────────┐             │
                       │   loadGameDetail()          │             │
                       │   /summary?event={id}       │             │
                       │                             │             │
                       │   Returns:                  │             │
                       │   • plays[] array           │             │
                       │     - text (description)    │             │
                       │     - type.text (category)  │             │
                       │     - team.id / .abbr       │             │
                       │     - shootingPlay (bool)   │             │
                       │     - scoreValue (1/2/3)    │             │
                       │     - clock, period         │             │
                       │     - homeScore, awayScore  │             │
                       └──────────────┬─────────────┘             │
                                      │                           │
                                      ▼                           │
                       ┌──────────────────────────────┐           │
                       │   resolveTeam()               │           │
                       │   (per play)                  │           │
                       │                               │           │
                       │   NBA: match by abbreviation  │           │
                       │   NCAA: match by numeric ID   │           │
                       │   Fallback: try both methods  │           │
                       │                               │           │
                       │   Unresolved plays are        │           │
                       │   filtered out entirely       │           │
                       └──────────────┬───────────────┘           │
                                      │                           │
                                      ▼                           │
                       ┌──────────────────────────────┐           │
                       │   scorePossession()           │           │
                       │   (per play)                  │           │
                       │                               │           │
                       │   Keyword detection:          │           │
                       │   ┌───────────┬────────┐      │           │
                       │   │ Event     │ Weight │      │           │
                       │   ├───────────┼────────┤      │           │
                       │   │ Made 3PT  │  +3.0  │      │           │
                       │   │ Miss 3PT  │  -1.2  │      │           │
                       │   │ Made 2PT  │  +2.0  │      │           │
                       │   │ Miss 2PT  │  -0.8  │      │           │
                       │   │ Made FT   │  +0.8  │      │           │
                       │   │ Miss FT   │  -0.4  │      │           │
                       │   │ Turnover  │  -2.5  │      │           │
                       │   │ Steal     │  +1.8  │      │           │
                       │   │ Block     │  +1.2  │      │           │
                       │   │ Off. Reb  │  +1.5  │      │           │
                       │   │ Def. Reb  │  +0.6  │      │           │
                       │   │ Fastbreak │  +2.5  │      │           │
                       │   └───────────┴────────┘      │           │
                       │                               │           │
                       │   Weights can stack on a       │           │
                       │   single play (e.g. steal      │           │
                       │   + fast break + made 2PT)     │           │
                       │                               │           │
                       │   SKIP play if:               │           │
                       │   score=0 AND not shooting    │           │
                       │   AND not rebound/turnover/   │           │
                       │   steal                       │           │
                       └──────────────┬───────────────┘           │
                                      │                           │
                                      ▼                           │
                       ┌──────────────────────────────┐           │
                       │   SLIDING WINDOW              │           │
                       │   (independent per team)      │           │
                       │                               │           │
                       │   awayWindow[]  homeWindow[]  │           │
                       │   max size: 12 events each    │           │
                       │                               │           │
                       │   New event → push to end     │           │
                       │   If length > 12 → shift      │           │
                       │   (remove oldest)             │           │
                       │                               │           │
                       │   Example:                    │           │
                       │   [+2.0, -0.8, +3.0, -2.5,   │           │
                       │    +1.8, +0.6, -1.2, +2.0,   │           │
                       │    +1.5, -0.8, +2.5, +3.0]   │           │
                       │    ───── 12 events ─────      │           │
                       │                               │           │
                       │   Raw score = sum of window   │           │
                       │   Range: ~[-15, +15]          │           │
                       └──────────────┬───────────────┘           │
                                      │                           │
                                      ▼                           │
                       ┌──────────────────────────────┐           │
                       │   toMomentum()                │           │
                       │                               │           │
                       │   clamp(raw, -15, +15)        │           │
                       │   ↓                           │           │
                       │   5 + ((clamped+15)/30) × 90  │           │
                       │   ↓                           │           │
                       │   round → [5, 95]             │           │
                       │                               │           │
                       │   -15 → 5   (floor)           │           │
                       │     0 → 50  (neutral)         │           │
                       │   +15 → 95  (ceiling)         │           │
                       └──────────────┬───────────────┘           │
                                      │                           │
                          ┌───────────┴────────────┐              │
                          │                        │              │
                          ▼                        ▼              │
              ┌──────────────────┐   ┌──────────────────┐         │
              │  CHART SAMPLING  │   │  FINAL MOMENTUM  │         │
              │                  │   │                   │         │
              │  Sample every    │   │  awayM: 0-100     │         │
              │  5th play        │   │  homeM: 0-100     │         │
              │                  │   │                   │         │
              │  Trim to max     │   │  + recentPlays[]  │         │
              │  60 data points  │   │    (last 8 plays) │         │
              │  (even-interval  │   │                   │         │
              │   downsampling)  │   └────────┬─────────┘         │
              │                  │            │                    │
              └────────┬─────────┘            │                   │
                       │                      │                   │
                       │    ┌─────────────────┘                   │
                       │    │                                     │
                       │    │   ┌─────────────────────────────┐   │
                       │    │   │  CHART HISTORY CHECK        │   │
                       │    │   │                             │   │
                       │    │   │  if prev.chartAway.length   │   │
                       │    │   │     > new.chartAway.length  │   │
                       │    │   │  then keep prev chart       │   │
                       │    │   │  (prevents data regression) │   │
                       │    │   └──────────────┬──────────────┘   │
                       │    │                  │                   │
                       └────┼──────────────────┘                  │
                            │                                     │
                            ▼                                     │
              ┌──────────────────────────────────┐                │
              │       detectAlerts()              │◄───────────────┘
              │                                   │
              │  Inputs:                          │
              │  • awayMomentum, homeMomentum     │
              │  • awayScore, homeScore           │
              │  • game status                    │
              │                                   │
              │  Computed:                        │
              │  • swingGap = |away - home|       │
              │  • scoreDiff = awayScore-homeScore│
              │  • awayLeadsScore (bool)          │
              │  • awayLeadsSwing (bool)          │
              │                                   │
              │  Thresholds (in-game / halftime): │
              │  ┌──────────────┬────────┬──────┐ │
              │  │ Parameter    │ Live   │  HT  │ │
              │  ├──────────────┼────────┼──────┤ │
              │  │ bluffMom     │  ≥ 10  │ ≥ 4  │ │
              │  │ bluffScore   │  ≥ 4   │ ≥ 2  │ │
              │  │ comebackMom  │  > 6   │ > 4  │ │
              │  │ comebackScore│  ≥ 5   │ ≥ 3  │ │
              │  │ swingGap     │  ≥ 35  │ ≥ 35 │ │
              │  └──────────────┴────────┴──────┘ │
              │                                   │
              │  ┌─── TIER 1 (highest priority)   │
              │  │ ⚡ SCORE IS BLUFFING            │
              │  │ score leader ≠ momentum leader │
              │  │ + sufficient gaps in both      │
              │  │                                │
              │  ├─── TIER 2                      │
              │  │ 👀 COMEBACK WATCH               │
              │  │ trailing team dominates         │
              │  │ momentum by > comebackMomLead  │
              │  │ + score gap ≥ comebackScoreGap │
              │  │                                │
              │  ├─── TIER 3 (lowest priority)    │
              │  │ ⚠️ SWING WARNING                │
              │  │ score close (< bluffScoreThresh│
              │  │ but swingGap ≥ 35              │
              │  │                                │
              │  └─── Mutually exclusive:         │
              │       evaluated in order,         │
              │       first match wins            │
              └──────────────┬────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────┐
              │         render()                  │
              │                                   │
              │  Sections (in order):             │
              │  ┌─────────────────────────────┐  │
              │  │ 🔴 IN PROGRESS               │  │
              │  │ (includes HALFTIME)          │  │
              │  ├─────────────────────────────┤  │
              │  │ UPCOMING TONIGHT             │  │
              │  ├─────────────────────────────┤  │
              │  │ FINAL                        │  │
              │  └─────────────────────────────┘  │
              │                                   │
              │  Per game card:                   │
              │  ┌─────────────────────────────┐  │
              │  │ League · Matchup   Status   │  │
              │  │                              │  │
              │  │ AWAY  Score  HOME            │  │
              │  │                              │  │
              │  │ ████░░░  SWING  ░░░████     │  │
              │  │ 72              38           │  │
              │  │                              │  │
              │  │ ~~~~ Sparkline Chart ~~~~    │  │
              │  │                              │  │
              │  │ ⚡ SCORE IS BLUFFING          │  │
              │  │                              │  │
              │  │ ▸ PLAY FEED (collapsible)    │  │
              │  │                              │  │
              │  │ Venue, City                  │  │
              │  └─────────────────────────────┘  │
              └──────────────┬────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────┐
              │    wireFeedToggles()              │
              │                                   │
              │  Attaches click handlers to       │
              │  ▸ PLAY FEED toggles              │
              │                                   │
              │  openFeeds: Set()                 │
              │  Tracks which feeds are expanded  │
              │  Preserves state across           │
              │  20-second re-renders             │
              └──────────────────────────────────┘
                             │
                             │
                    ─ ─ ─ ─ ─│─ ─ ─ ─ ─
                             │
                             ▼
              ┌──────────────────────────────────┐
              │        REFRESH LOOP               │
              │                                   │
              │  setInterval(loadAll, 20000)      │
              │                                   │
              │  Every 20 seconds:                │
              │  1. Fetch scoreboards             │
              │  2. Fetch details for live games  │
              │  3. Compute momentum              │
              │  4. Detect alerts                 │
              │  5. Re-render DOM                 │
              │  6. Restore feed toggle states    │
              │                                   │
              │  Manual refresh also available    │
              │  via ↻ REFRESH button             │
              └──────────────────────────────────┘
```

---

## Simplified Linear Flow

```
ESPN API
   │
   ├──► Scoreboard (NBA + NCAA)
   │         │
   │         ▼
   │    parseScoreboard() ──► game objects (scores, teams, status)
   │
   ├──► Play-by-Play (per live game)
   │         │
   │         ▼
   │    resolveTeam() ──► attribute each play to away or home
   │         │
   │         ▼
   │    scorePossession() ──► weight each play event (+3.0, -2.5, etc.)
   │         │
   │         ▼
   │    sliding window (12 events per team, independent)
   │         │
   │         ▼
   │    toMomentum() ──► raw sum → 0-100 scale
   │         │
   │         ▼
   │    detectAlerts() ──► BLUFFING / COMEBACK / SWING WARNING
   │
   └──► render() ──► DOM update ──► user sees dashboard
                                         │
                                    wait 20 seconds
                                         │
                                    loop back to top
```
