#!/usr/bin/env node

/**
 * The Swing — Post-backfill analysis and reporting.
 *
 * Usage:
 *   node scripts/analysis.js [--league NBA|CBB]
 */

const { parseArgs } = require('util');
const db = require('../lib/db');

function sep(title) {
  if (title) console.log(`\n${'─'.repeat(20)} ${title} ${'─'.repeat(20)}`);
  else console.log('─'.repeat(60));
}

function main() {
  const { values } = parseArgs({
    options: {
      league: { type: 'string' },
    },
  });

  const database = db.initDb();
  const league = values.league?.toUpperCase();

  const lf = league ? ' AND g.league = ?' : '';
  const lp = league ? [league] : [];

  // Overall stats
  sep('BACKFILL SUMMARY');

  const totalGames = database
    .prepare(
      `SELECT COUNT(*) as cnt FROM games g
       JOIN game_momentum gm ON g.game_id = gm.game_id
       WHERE 1=1 ${lf}`,
    )
    .get(...lp);

  const row = database
    .prepare(
      `SELECT
         COUNT(DISTINCT bl.game_id) as games_with_alerts,
         SUM(bl.total_alerts) as total_alerts,
         SUM(bl.bluffing_count) as bluffing,
         SUM(bl.comeback_count) as comeback,
         SUM(bl.swing_warn_count) as swing_warning
       FROM backfill_log bl
       JOIN games g ON bl.game_id = g.game_id
       WHERE 1=1 ${lf}`,
    )
    .get(...lp);

  console.log(`Total games processed:     ${totalGames.cnt}`);
  console.log(`Games with alerts:         ${row.games_with_alerts || 0}`);
  console.log(`Total alerts fired:        ${row.total_alerts || 0}`);
  console.log(`  BLUFFING:                ${row.bluffing || 0}`);
  console.log(`  COMEBACK WATCH:          ${row.comeback || 0}`);
  console.log(`  SWING WARNING:           ${row.swing_warning || 0}`);

  // Alert accuracy
  sep('ALERT ACCURACY');

  const acc = database
    .prepare(
      `SELECT
         SUM(bl.bluff_correct) as bc, SUM(bl.bluff_total) as bt,
         SUM(bl.comeback_correct) as cc, SUM(bl.comeback_total) as ct
       FROM backfill_log bl
       JOIN games g ON bl.game_id = g.game_id
       WHERE 1=1 ${lf}`,
    )
    .get(...lp);

  if (acc.bt > 0) {
    console.log(`BLUFFING accuracy:         ${acc.bc}/${acc.bt} (${((acc.bc / acc.bt) * 100).toFixed(1)}%)`);
  } else {
    console.log('BLUFFING accuracy:         No data');
  }

  if (acc.ct > 0) {
    console.log(`COMEBACK accuracy:         ${acc.cc}/${acc.ct} (${((acc.cc / acc.ct) * 100).toFixed(1)}%)`);
  } else {
    console.log('COMEBACK accuracy:         No data');
  }

  // Momentum distribution
  sep('MOMENTUM AT GAME END');

  const dist = database
    .prepare(
      `SELECT
         AVG(gm.final_away_mom) as avg_away,
         AVG(gm.final_home_mom) as avg_home,
         MIN(gm.final_away_mom) as min_away, MAX(gm.final_away_mom) as max_away,
         MIN(gm.final_home_mom) as min_home, MAX(gm.final_home_mom) as max_home
       FROM game_momentum gm
       JOIN games g ON gm.game_id = g.game_id
       WHERE 1=1 ${lf}`,
    )
    .get(...lp);

  if (dist.avg_away != null) {
    console.log(`Away momentum:  avg=${dist.avg_away.toFixed(1)}  min=${dist.min_away}  max=${dist.max_away}`);
    console.log(`Home momentum:  avg=${dist.avg_home.toFixed(1)}  min=${dist.min_home}  max=${dist.max_home}`);
  }

  // Winner had higher momentum?
  sep('MOMENTUM vs OUTCOME');

  const wm = database
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE
           WHEN (g.away_score > g.home_score AND gm.final_away_mom > gm.final_home_mom)
             OR (g.home_score > g.away_score AND gm.final_home_mom > gm.final_away_mom)
           THEN 1 ELSE 0 END) as winner_had_momentum,
         SUM(CASE WHEN gm.final_away_mom = gm.final_home_mom THEN 1 ELSE 0 END) as tied_momentum
       FROM game_momentum gm
       JOIN games g ON gm.game_id = g.game_id
       WHERE g.status = 'STATUS_FINAL' ${lf}`,
    )
    .get(...lp);

  if (wm.total > 0) {
    console.log(
      `Winner had higher final momentum: ${wm.winner_had_momentum}/${wm.total} (${((wm.winner_had_momentum / wm.total) * 100).toFixed(1)}%)`,
    );
    console.log(`Tied final momentum:              ${wm.tied_momentum}`);
  }

  // Most alert-heavy games
  sep('TOP 10 MOST VOLATILE GAMES');

  const top = database
    .prepare(
      `SELECT bl.game_id, g.short_name, g.game_date, g.league,
              g.away_score, g.home_score,
              bl.total_alerts, bl.bluffing_count, bl.comeback_count, bl.swing_warn_count
       FROM backfill_log bl
       JOIN games g ON bl.game_id = g.game_id
       WHERE 1=1 ${lf}
       ORDER BY bl.total_alerts DESC
       LIMIT 10`,
    )
    .all(...lp);

  for (const r of top) {
    console.log(
      `  ${r.game_date}  ${r.league}  ${r.short_name || r.game_id}  ` +
        `${r.away_score}-${r.home_score}  alerts=${r.total_alerts} ` +
        `(B:${r.bluffing_count} C:${r.comeback_count} S:${r.swing_warn_count})`,
    );
  }

  // Biggest divergences
  sep('TOP 10 BIGGEST DIVERGENCES');

  const div = database
    .prepare(
      `SELECT a.game_id, g.short_name, g.game_date, g.league,
              a.away_momentum, a.home_momentum,
              a.away_score, a.home_score,
              ABS(a.away_momentum - a.home_momentum) as mom_gap,
              a.alert_type
       FROM alerts a
       JOIN games g ON a.game_id = g.game_id
       WHERE a.alert_type = 'BLUFFING' ${lf}
       ORDER BY mom_gap DESC
       LIMIT 10`,
    )
    .all(...lp);

  for (const r of div) {
    console.log(
      `  ${r.game_date}  ${r.short_name || r.game_id}  ` +
        `mom=${r.away_momentum}-${r.home_momentum} (gap=${r.mom_gap})  ` +
        `score=${r.away_score}-${r.home_score}  ${r.league}`,
    );
  }

  sep();
}

main();
