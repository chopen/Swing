/** /api/poll — fetches ESPN scoreboards + play-by-play, computes momentum & alerts, returns everything. */

const {
  fetchNbaScoreboard,
  fetchCbbScoreboard,
  fetchGameSummary,
  parseScoreboardEvent,
  getPlaysFromSummary,
} = require('../../../lib/espn');

const { computeMomentumFromPlays } = require('../../../lib/momentum');
const { detectAlerts } = require('../../../lib/alerts');
import { computeGameVolatility } from '../../../lib/mvix';
import { hasGameRecord, recordGameMvix } from '../../../lib/team-mvix';

const LIVE_STATUSES = new Set(['STATUS_IN_PROGRESS', 'STATUS_HALFTIME']);
const CACHE_TTL = 10_000; // 10 seconds

let cachedResponse = null;
let cacheTimestamp = 0;
let fetchInFlight = null;
const finalMomCache = new Map(); // gameId -> momentum data (never changes once final)

export const dynamic = 'force-dynamic';

async function buildPollData() {
  const [nbaEvents, cbbEvents] = await Promise.all([
    fetchNbaScoreboard(),
    fetchCbbScoreboard(),
  ]);

  const allEvents = [
    ...nbaEvents.map((e) => ({ ...e, league: 'NBA' })),
    ...cbbEvents.map((e) => ({ ...e, league: 'CBB' })),
  ];

  // Sort: live first, then upcoming, then final
  const sortOrder = {
    STATUS_IN_PROGRESS: 0,
    STATUS_HALFTIME: 0,
    STATUS_SCHEDULED: 1,
    STATUS_FINAL: 2,
  };
  allEvents.sort(
    (a, b) =>
      (sortOrder[a.status?.type?.name] ?? 3) -
      (sortOrder[b.status?.type?.name] ?? 3)
  );

  // Parse all events into game objects
  const games = allEvents.map((e) => parseScoreboardEvent(e, e.league));

  // For live games, fetch play-by-play in parallel
  const detailPromises = games.map(async (g) => {
    const needDetail =
      LIVE_STATUSES.has(g.status) ||
      (g.status === 'STATUS_FINAL' && g.period >= 2);

    if (needDetail) {
      // Use cached momentum for final games
      if (g.status === 'STATUS_FINAL' && finalMomCache.has(g.id)) {
        g.mom = finalMomCache.get(g.id);
      } else {
        const summary = await fetchGameSummary(g.id, g.league);
        const plays = getPlaysFromSummary(summary);
        if (plays.length > 0) {
          g.mom = computeMomentumFromPlays(
            plays,
            g.awayAbbr,
            g.homeAbbr,
            g.awayId,
            g.homeId,
            g.league
          );
          // Cache momentum permanently once game is final
          if (g.status === 'STATUS_FINAL') {
            finalMomCache.set(g.id, g.mom);
          }
        }
      }
    }

    const alerts = detectAlerts(g);
    g.bluffing = alerts.bluffing;
    g.comeback = alerts.comeback;
    g.swingWarning = alerts.swingWarning;

    return g;
  });

  const resolvedGames = await Promise.all(detailPromises);
  const timestamp = new Date().toISOString();

  // Fire-and-forget: record MVIX for newly final games
  recordFinalGameMvix(resolvedGames).catch((err) =>
    console.error('MVIX record error:', err)
  );

  return { games: resolvedGames, timestamp };
}

const mvixRecorded = new Set(); // in-memory dedup

async function recordFinalGameMvix(games) {
  for (const g of games) {
    if (g.status !== 'STATUS_FINAL' || !g.mom?.chartAway || !g.mom?.chartHome) continue;
    // Skip if already recorded this session
    const awayKey = `${g.awayAbbr}:${g.id}`;
    const homeKey = `${g.homeAbbr}:${g.id}`;
    if (mvixRecorded.has(awayKey)) continue;

    try {
      // Check DB to avoid duplicates across restarts
      const awayExists = await hasGameRecord(g.awayAbbr, g.id);
      if (awayExists) {
        mvixRecorded.add(awayKey);
        mvixRecorded.add(homeKey);
        continue;
      }

      const vol = computeGameVolatility(g.mom.chartAway, g.mom.chartHome, g.league);
      if (!vol?.away || !vol?.home) continue;

      const awayWon = g.awayScore > g.homeScore;
      const gameDate = g.gameDate || g.date?.slice(0, 10) || new Date().toISOString().slice(0, 10);

      await Promise.all([
        recordGameMvix(g.awayAbbr, g.league, g.id, gameDate, awayWon, `${g.awayScore}-${g.homeScore}`, vol.away),
        recordGameMvix(g.homeAbbr, g.league, g.id, gameDate, !awayWon, `${g.homeScore}-${g.awayScore}`, vol.home),
      ]);

      mvixRecorded.add(awayKey);
      mvixRecorded.add(homeKey);
      console.log(`MVIX recorded: ${g.awayAbbr} vs ${g.homeAbbr} (${g.id})`);
    } catch (err) {
      console.error(`MVIX record failed for ${g.id}:`, err.message);
    }
  }
}

export async function GET() {
  try {
    const now = Date.now();

    // Return cached response if still fresh
    if (cachedResponse && now - cacheTimestamp < CACHE_TTL) {
      return Response.json(cachedResponse);
    }

    // If a fetch is already in flight, wait for it instead of starting another
    if (!fetchInFlight) {
      fetchInFlight = buildPollData()
        .then((data) => {
          cachedResponse = data;
          cacheTimestamp = Date.now();
          return data;
        })
        .finally(() => {
          fetchInFlight = null;
        });
    }

    const data = await fetchInFlight;
    return Response.json(data);
  } catch (err) {
    console.error('Poll error:', err);
    // Serve stale cache on error if available
    if (cachedResponse) {
      return Response.json(cachedResponse);
    }
    return Response.json({ games: [], timestamp: new Date().toISOString(), error: err.message }, { status: 500 });
  }
}
