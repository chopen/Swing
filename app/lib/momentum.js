/** The Swing — Momentum engine (matches JS in index.html exactly). */

const { WINDOW, MAX_CHART_POINTS, WEIGHTS, RAW_MIN, RAW_MAX, NBA_RAW_MIN, NBA_RAW_MAX, NORM_MIN, NORM_MAX } = require('./config');

function resolveTeam(playTeam, awayAbbr, homeAbbr, awayId, homeId) {
  if (!playTeam) return null;
  if (awayId && playTeam.id === String(awayId)) return awayAbbr;
  if (homeId && playTeam.id === String(homeId)) return homeAbbr;
  if (playTeam.abbreviation === awayAbbr) return awayAbbr;
  if (playTeam.abbreviation === homeAbbr) return homeAbbr;
  return null;
}

function scorePossession(play) {
  const text = (play.text || '').toLowerCase();
  const type = (play.type?.text || '').toLowerCase();
  const val = play.scoreValue || 0;
  const isMake = text.includes('makes') || text.includes('make');
  const isMiss = text.includes('misses') || text.includes('miss');
  const isShooting = play.shootingPlay;

  let score = 0;

  if (isShooting) {
    if (val === 3) score = isMake ? WEIGHTS.make3 : WEIGHTS.miss3;
    else if (val === 2) score = isMake ? WEIGHTS.make2 : WEIGHTS.miss2;
    else if (val === 1) score = isMake ? WEIGHTS.makeFT : WEIGHTS.missFT;
  }

  if (type.includes('turnover') || text.includes('turnover') || text.includes('bad pass') || text.includes('lost ball')) {
    score += WEIGHTS.turnover;
  }

  if (type.includes('steal') || text.includes('steal')) score += WEIGHTS.steal;
  if (type.includes('block') || text.includes('block')) score += WEIGHTS.block;

  if (type.includes('rebound') || text.includes('rebound')) {
    if (text.includes('offensive')) score += WEIGHTS.offReb;
    else score += WEIGHTS.defReb;
  }

  if (text.includes('fast break') || text.includes('fastbreak')) score += WEIGHTS.fastBreak;

  return score;
}

function toMomentum(raw, league) {
  const rMin = league === 'NBA' ? NBA_RAW_MIN : RAW_MIN;
  const rMax = league === 'NBA' ? NBA_RAW_MAX : RAW_MAX;
  const clamped = Math.max(rMin, Math.min(rMax, raw));
  return Math.round(NORM_MIN + ((clamped - rMin) / (rMax - rMin)) * (NORM_MAX - NORM_MIN));
}

function trimChart(arr) {
  if (arr.length <= MAX_CHART_POINTS) return arr;
  const step = arr.length / MAX_CHART_POINTS;
  return Array.from({ length: MAX_CHART_POINTS }, (_, i) => arr[Math.floor(i * step)]);
}

function computeMomentumFromPlays(plays, awayAbbr, homeAbbr, awayId, homeId, league) {
  if (!plays || plays.length === 0) return null;

  const teamedPlays = plays.filter((p) => resolveTeam(p.team, awayAbbr, homeAbbr, awayId, homeId));
  if (teamedPlays.length === 0) return null;

  const chartAway = [];
  const chartHome = [];
  const awayWindow = [];
  const homeWindow = [];
  const scoredPlays = [];

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

    if (i % 5 === 0) {
      const rawAway = awayWindow.reduce((a, b) => a + b, 0);
      const rawHome = homeWindow.reduce((a, b) => a + b, 0);
      const awayM = toMomentum(rawAway, league);
      const homeM = toMomentum(rawHome, league);
      chartAway.push({
        t: play.wallclock,
        p: play.period?.number,
        c: play.clock?.displayValue,
        v: awayM,
        hs: play.homeScore,
        as: play.awayScore,
      });
      chartHome.push({
        t: play.wallclock,
        p: play.period?.number,
        c: play.clock?.displayValue,
        v: homeM,
      });
    }

    scoredPlays.push({
      period: play.period?.number,
      clock: play.clock?.displayValue,
      wallclock: play.wallclock,
      teamId: play.team?.id || null,
      teamAbbr: team,
      playText: play.text || '',
      playType: play.type?.text || '',
      scoreValue: play.scoreValue || 0,
      shootingPlay: play.shootingPlay ? 1 : 0,
      homeScore: play.homeScore,
      awayScore: play.awayScore,
      possessionScore: ps,
    });
  });

  const rawAway = awayWindow.reduce((a, b) => a + b, 0);
  const rawHome = homeWindow.reduce((a, b) => a + b, 0);
  const awayM = toMomentum(rawAway, league);
  const homeM = toMomentum(rawHome, league);

  const recentPlays = teamedPlays
    .slice(-8)
    .reverse()
    .map((p) => {
      const text = (p.text || '').toLowerCase();
      const team = resolveTeam(p.team, awayAbbr, homeAbbr, awayId, homeId);
      return {
        clock: p.clock?.displayValue,
        period: p.period?.number,
        text: p.text || '',
        team,
        type: p.type?.text || '',
        isMake: text.includes('makes'),
        isTurnover: (p.type?.text || '').toLowerCase().includes('turnover') || text.includes('turnover'),
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        scoreValue: p.scoreValue,
      };
    });

  return {
    away: awayM,
    home: homeM,
    chartAway: trimChart(chartAway),
    chartHome: trimChart(chartHome),
    recentPlays,
    scoredPlays,
    totalPlays: plays.length,
    totalTeamed: teamedPlays.length,
  };
}

module.exports = { resolveTeam, scorePossession, toMomentum, computeMomentumFromPlays };
