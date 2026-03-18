/**
 * /api/mvix/backfill?days=14&league=NBA
 * /api/mvix/backfill?days=14&league=CBB
 *
 * Backfills MVIX history for all teams from the past N days.
 * Safe to call multiple times — uses ON CONFLICT DO UPDATE.
 */

const {
  fetchNbaScoreboard,
  fetchCbbScoreboard,
  fetchGameSummary,
  parseScoreboardEvent,
  getPlaysFromSummary,
} = require('../../../../lib/espn');

const { computeMomentumFromPlays } = require('../../../../lib/momentum');
import { computeGameVolatility } from '../../../../lib/mvix';
import { recordGameMvix } from '../../../../lib/team-mvix';

export const dynamic = 'force-dynamic';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const league = url.searchParams.get('league') || 'both';
    const startParam = url.searchParams.get('start'); // YYYY-MM-DD
    const endParam = url.searchParams.get('end');     // YYYY-MM-DD
    const days = parseInt(url.searchParams.get('days') || '14', 10);

    const now = new Date();
    const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

    // Build list of dates to process
    const datesToProcess = [];
    if (startParam && endParam) {
      // Date range mode: iterate from start to end
      const cur = new Date(startParam + 'T12:00:00Z');
      const endDate = new Date(endParam + 'T12:00:00Z');
      while (cur <= endDate) {
        datesToProcess.push(new Date(cur));
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    } else {
      // Days-back mode (original behavior)
      for (let d = 0; d < days; d++) {
        const date = new Date(eastern);
        date.setDate(date.getDate() - d);
        datesToProcess.push(date);
      }
    }

    const results = [];
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails = [];

    for (const date of datesToProcess) {
      const dateStr =
        date.getFullYear().toString() +
        String(date.getMonth() + 1).padStart(2, '0') +
        String(date.getDate()).padStart(2, '0');
      const dateISO = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6)}`;

      let events = [];
      try {
        if (league === 'NBA' || league === 'both') {
          const nba = await fetchNbaScoreboard(dateStr);
          events.push(...nba.map((e) => ({ ...e, league: 'NBA' })));
        }
        if (league === 'CBB' || league === 'both') {
          const cbb = await fetchCbbScoreboard(dateStr);
          events.push(...cbb.map((e) => ({ ...e, league: 'CBB' })));
        }
      } catch (err) {
        errors++;
        continue;
      }

      // Only process final games
      const finalEvents = events.filter(
        (e) => e.status?.type?.name === 'STATUS_FINAL'
      );

      for (const event of finalEvents) {
        let game = null;
        try {
          game = parseScoreboardEvent(event, event.league);
          if (!game || game.period < 2) {
            skipped++;
            continue;
          }

          const summary = await fetchGameSummary(game.id, game.league);
          const plays = getPlaysFromSummary(summary);
          if (!plays || plays.length === 0) {
            skipped++;
            continue;
          }

          const mom = computeMomentumFromPlays(
            plays,
            game.awayAbbr,
            game.homeAbbr,
            game.awayId,
            game.homeId,
            game.league
          );

          if (!mom?.chartAway || !mom?.chartHome) {
            skipped++;
            continue;
          }

          const vol = computeGameVolatility(mom.chartAway, mom.chartHome, game.league);
          if (!vol?.away || !vol?.home) {
            skipped++;
            continue;
          }

          const awayWon = game.awayScore > game.homeScore;
          const gameDate = game.gameDate || dateISO;

          await Promise.all([
            recordGameMvix(game.awayAbbr, game.league, game.id, gameDate, awayWon, `${game.awayScore}-${game.homeScore}`, vol.away),
            recordGameMvix(game.homeAbbr, game.league, game.id, gameDate, !awayWon, `${game.homeScore}-${game.awayScore}`, vol.home),
          ]);

          processed++;
          results.push(`${dateISO} ${game.awayAbbr} vs ${game.homeAbbr} (${game.league})`);

          // Rate limit ESPN requests
          await sleep(500);
        } catch (err) {
          errors++;
          if (errorDetails.length < 5) {
            errorDetails.push(`${game?.awayAbbr || '?'} vs ${game?.homeAbbr || '?'} (${game?.id || '?'}): ${err.message}`);
          }
        }
      }

      // Small delay between dates
      await sleep(300);
    }

    return Response.json({
      success: true,
      days,
      league,
      gamesProcessed: processed,
      gamesSkipped: skipped,
      errors,
      errorDetails,
      games: results,
    });
  } catch (err) {
    console.error('Backfill error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
