/** Compute per-player swing impact from play-by-play data. */

const { resolveTeam, scorePossession, toMomentum } = require('./momentum');
const { WINDOW } = require('./config');

function gameSeconds(point, league) {
  const p = point.p || 1;
  const c = point.c || '0:00';
  const [m, s] = c.split(':').map(Number);
  const periodSecs = league === 'NBA' ? 12 * 60 : 20 * 60;
  return (p - 1) * periodSecs + (periodSecs - ((m || 0) * 60 + (s || 0)));
}

function findInflections(chart, league) {
  const d1 = [];
  for (let i = 0; i < chart.length; i++) {
    const t = gameSeconds(chart[i], league);
    let dv;
    if (i === 0 && chart.length > 1) {
      const dt = gameSeconds(chart[i + 1], league) - t;
      dv = dt > 0 ? (chart[i + 1].v - chart[i].v) / dt : 0;
    } else if (i === chart.length - 1) {
      const dt = t - gameSeconds(chart[i - 1], league);
      dv = dt > 0 ? (chart[i].v - chart[i - 1].v) / dt : 0;
    } else {
      const dt = gameSeconds(chart[i + 1], league) - gameSeconds(chart[i - 1], league);
      dv = dt > 0 ? (chart[i + 1].v - chart[i - 1].v) / dt : 0;
    }
    d1.push({ gameTime: t, v: chart[i].v, dv, idx: i });
  }

  const d2 = [];
  for (let i = 0; i < d1.length; i++) {
    let d2v;
    if (i === 0 && d1.length > 1) {
      d2v = (d1[1].dv - d1[0].dv) / Math.max(1, d1[1].gameTime - d1[0].gameTime);
    } else if (i === d1.length - 1) {
      d2v = (d1[i].dv - d1[i - 1].dv) / Math.max(1, d1[i].gameTime - d1[i - 1].gameTime);
    } else {
      d2v = (d1[i + 1].dv - d1[i - 1].dv) / Math.max(1, d1[i + 1].gameTime - d1[i - 1].gameTime);
    }
    d2.push({ ...d1[i], d2v });
  }

  const inflections = [];
  for (let i = 1; i < d2.length; i++) {
    const prev = d2[i - 1].d2v;
    const curr = d2[i].d2v;
    if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
      inflections.push({
        idx: d2[i].idx,
        prevIdx: d2[i - 1].idx,
        upward: d2[i].v > d2[i - 1].v,
        magnitude: Math.round(Math.abs(d2[i].v - d2[i - 1].v) * 10) / 10,
        fromMomentum: d2[i - 1].v,
        toMomentum: d2[i].v,
      });
    }
  }
  return inflections;
}

function buildRoster(summary) {
  const roster = {};
  for (const team of summary.boxscore?.players || []) {
    for (const stat of team.statistics || []) {
      for (const athlete of stat.athletes || []) {
        const a = athlete.athlete;
        if (a?.id) roster[a.id] = { name: a.displayName || a.shortName || 'Unknown', jersey: a.jersey || null };
      }
    }
  }
  for (const team of summary.rosters || []) {
    for (const entry of team.roster || []) {
      if (entry.id) {
        const existing = roster[entry.id];
        roster[entry.id] = {
          name: entry.displayName || entry.shortName || existing?.name || 'Unknown',
          jersey: entry.jersey || existing?.jersey || null,
        };
      }
    }
  }
  return roster;
}

function replayMomentumWithPlayers(plays, awayAbbr, homeAbbr, awayId, homeId, league, roster) {
  const teamedPlays = plays.filter((p) => resolveTeam(p.team, awayAbbr, homeAbbr, awayId, homeId));

  const chartAway = [];
  const chartHome = [];
  const awayWindow = [];
  const homeWindow = [];
  const batchPlays = [];
  let currentBatch = [];

  teamedPlays.forEach((play, i) => {
    const team = resolveTeam(play.team, awayAbbr, homeAbbr, awayId, homeId);
    const ps = scorePossession(play);
    const playType = (play.type?.text || '').toLowerCase();

    if (
      ps === 0 &&
      !play.shootingPlay &&
      !playType.includes('rebound') &&
      !playType.includes('turnover') &&
      !playType.includes('steal')
    ) {
      return;
    }

    if (team === awayAbbr) {
      awayWindow.push(ps);
      if (awayWindow.length > WINDOW) awayWindow.shift();
    } else if (team === homeAbbr) {
      homeWindow.push(ps);
      if (homeWindow.length > WINDOW) homeWindow.shift();
    }

    const athleteId = play.participants?.[0]?.athlete?.id;
    let playerName = null;
    let jersey = null;
    if (athleteId && roster[athleteId]) {
      playerName = roster[athleteId].name;
      jersey = roster[athleteId].jersey;
    } else if (play.text) {
      const match = play.text.match(/^([A-Z][a-z''-]+ [A-Z][a-z''-]+)/);
      if (match) playerName = match[1];
    }

    currentBatch.push({
      player: playerName,
      athleteId: athleteId || null,
      jersey,
      team,
      possessionScore: ps,
      text: play.text || '',
      type: play.type?.text || '',
      period: play.period?.number,
      clock: play.clock?.displayValue,
      awayScore: play.awayScore,
      homeScore: play.homeScore,
    });

    if (i % 5 === 0) {
      const rawAway = awayWindow.reduce((a, b) => a + b, 0);
      const rawHome = homeWindow.reduce((a, b) => a + b, 0);
      chartAway.push({ v: toMomentum(rawAway, league), p: play.period?.number, c: play.clock?.displayValue });
      chartHome.push({ v: toMomentum(rawHome, league), p: play.period?.number, c: play.clock?.displayValue });
      batchPlays.push([...currentBatch]);
      currentBatch = [];
    }
  });

  if (currentBatch.length > 0) {
    batchPlays.push([...currentBatch]);
  }

  return { chartAway, chartHome, batchPlays };
}

/**
 * Check if a play occurred in the clutch window:
 * final 5 minutes of regulation AND score within 12 points.
 */
function isClutchPlay(play, league) {
  if (!play.period || !play.clock) return false;
  const regPeriods = league === 'NBA' ? 4 : 2;
  if (play.period !== regPeriods) return false;
  const [m] = play.clock.split(':').map(Number);
  if ((m || 0) >= 5) return false;
  if (play.awayScore != null && play.homeScore != null) {
    if (Math.abs(play.awayScore - play.homeScore) > 12) return false;
  }
  return true;
}

function computeSwingImpact(inflections, batchPlays, teamAbbr, league) {
  const playerMap = {};
  const swings = [];

  for (const swing of inflections) {
    const startIdx = Math.max(0, swing.prevIdx);
    const endIdx = Math.min(batchPlays.length - 1, swing.idx);

    const windowPlays = [];
    for (let b = startIdx; b <= endIdx; b++) {
      if (batchPlays[b]) windowPlays.push(...batchPlays[b]);
    }

    const teamPlays = windowPlays.filter((p) => p.team === teamAbbr && p.possessionScore !== 0);
    const mag = swing.magnitude || 1;

    swings.push({
      direction: swing.upward ? 'up' : 'down',
      magnitude: swing.magnitude,
      fromMomentum: swing.fromMomentum,
      toMomentum: swing.toMomentum,
      plays: teamPlays.map((p) => ({
        player: p.player,
        impact: Math.round(p.possessionScore * 10) / 10,
        text: p.text,
        period: p.period,
        clock: p.clock,
      })),
    });

    for (const p of teamPlays) {
      if (!p.player) continue;
      if (!playerMap[p.player]) {
        playerMap[p.player] = {
          athleteId: p.athleteId,
          jersey: p.jersey,
          totalImpact: 0,
          weightedImpact: 0,
          swingAppearances: 0,
          positivePlays: 0,
          negativePlays: 0,
          clutchAppearances: 0,
          clutchPositive: 0,
        };
      }
      const entry = playerMap[p.player];
      entry.totalImpact += p.possessionScore;
      entry.weightedImpact += p.possessionScore * mag;
      entry.swingAppearances++;
      if (p.possessionScore > 0) entry.positivePlays++;
      else entry.negativePlays++;
      if (isClutchPlay(p, league)) {
        entry.clutchAppearances++;
        if (p.possessionScore > 0) entry.clutchPositive++;
      }
    }
  }

  const leaderboard = Object.entries(playerMap)
    .map(([name, data]) => ({
      player: name,
      athleteId: data.athleteId,
      jersey: data.jersey,
      totalImpact: Math.round(data.totalImpact * 10) / 10,
      weightedImpact: Math.round(data.weightedImpact * 10) / 10,
      swingAppearances: data.swingAppearances,
      positivePlays: data.positivePlays,
      negativePlays: data.negativePlays,
      efficiency: data.swingAppearances > 0
        ? Math.round((data.positivePlays / data.swingAppearances) * 1000) / 10
        : 0,
      clutchAppearances: data.clutchAppearances,
      clutchPositive: data.clutchPositive,
    }))
    .sort((a, b) => b.weightedImpact - a.weightedImpact);

  return { swings, leaderboard };
}

/**
 * High-level: compute swing impact for both teams in a game.
 * Returns null if insufficient data.
 */
function computeGameSwingImpact(plays, summary, game) {
  const roster = buildRoster(summary);
  const { chartAway, chartHome, batchPlays } = replayMomentumWithPlayers(
    plays, game.awayAbbr, game.homeAbbr, game.awayId, game.homeId, game.league, roster
  );

  if (chartAway.length < 3 || chartHome.length < 3) return null;

  const awayInflections = findInflections(chartAway, game.league);
  const homeInflections = findInflections(chartHome, game.league);

  const awayResult = computeSwingImpact(awayInflections, batchPlays, game.awayAbbr, game.league);
  const homeResult = computeSwingImpact(homeInflections, batchPlays, game.homeAbbr, game.league);

  return {
    away: {
      team: game.awayAbbr,
      inflections: awayInflections,
      ...awayResult,
    },
    home: {
      team: game.homeAbbr,
      inflections: homeInflections,
      ...homeResult,
    },
  };
}

module.exports = {
  findInflections,
  buildRoster,
  replayMomentumWithPlayers,
  computeSwingImpact,
  computeGameSwingImpact,
};
