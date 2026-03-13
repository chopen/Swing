/** The Swing — Alert detection (three-tier system). */

const { ALERT_THRESHOLDS, LIVE_STATUSES } = require('./config');

function detectAlerts(game) {
  const mom = game.mom;
  if (!mom) return { bluffing: false, comeback: false, swingWarning: false };

  const { away, home } = mom;
  const swingGap = Math.abs(away - home);
  const scoreDiff = game.awayScore - game.homeScore;
  const awayLeadsScore = scoreDiff > 0;
  const awayLeadsSwing = away > home;
  const isLive = LIVE_STATUSES.has(game.status);
  const isHT = game.status === 'STATUS_HALFTIME';

  const ctx = isHT ? 'ht' : 'live';
  const bluffMomThresh = ALERT_THRESHOLDS.bluff_mom[ctx];
  const bluffScoreThresh = ALERT_THRESHOLDS.bluff_score[ctx];
  const comebackMomLead = ALERT_THRESHOLDS.comeback_mom[ctx];
  const comebackScoreGap = ALERT_THRESHOLDS.comeback_score[ctx];

  const bluffing =
    isLive &&
    swingGap >= bluffMomThresh &&
    Math.abs(scoreDiff) >= bluffScoreThresh &&
    awayLeadsScore !== awayLeadsSwing;

  const trailingLeadsSwing =
    scoreDiff > 0 ? home > away + comebackMomLead : away > home + comebackMomLead;

  const comeback =
    isLive &&
    !bluffing &&
    Math.abs(scoreDiff) >= comebackScoreGap &&
    trailingLeadsSwing;

  const swingWarning =
    isLive &&
    !bluffing &&
    !comeback &&
    Math.abs(scoreDiff) < bluffScoreThresh &&
    swingGap >= ALERT_THRESHOLDS.swing_gap;

  return { bluffing, comeback, swingWarning };
}

module.exports = { detectAlerts };
