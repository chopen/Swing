/** The Swing — SQLite database setup and helpers. */

const Database = require('better-sqlite3');
const { DB_PATH } = require('./config');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS games (
    game_id       TEXT PRIMARY KEY,
    league        TEXT NOT NULL,
    game_date     TEXT NOT NULL,
    status        TEXT NOT NULL,
    away_abbr     TEXT NOT NULL,
    home_abbr     TEXT NOT NULL,
    away_id       TEXT,
    home_id       TEXT,
    away_name     TEXT,
    home_name     TEXT,
    away_color    TEXT,
    home_color    TEXT,
    away_score    INTEGER DEFAULT 0,
    home_score    INTEGER DEFAULT 0,
    period        INTEGER,
    clock         TEXT,
    network       TEXT,
    venue         TEXT,
    short_name    TEXT,
    name          TEXT,
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plays (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id         TEXT NOT NULL REFERENCES games(game_id),
    play_index      INTEGER NOT NULL,
    period          INTEGER,
    clock           TEXT,
    wallclock       TEXT,
    team_id         TEXT,
    team_abbr       TEXT,
    play_text       TEXT,
    play_type       TEXT,
    score_value     INTEGER DEFAULT 0,
    shooting_play   INTEGER DEFAULT 0,
    home_score      INTEGER,
    away_score      INTEGER,
    possession_score REAL,
    UNIQUE(game_id, play_index)
);

CREATE TABLE IF NOT EXISTS momentum_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id         TEXT NOT NULL REFERENCES games(game_id),
    snapshot_index  INTEGER NOT NULL,
    away_momentum   INTEGER NOT NULL,
    home_momentum   INTEGER NOT NULL,
    period          INTEGER,
    clock           TEXT,
    wallclock       TEXT,
    home_score      INTEGER,
    away_score      INTEGER,
    captured_at     TEXT,
    UNIQUE(game_id, snapshot_index)
);

CREATE TABLE IF NOT EXISTS game_momentum (
    game_id         TEXT PRIMARY KEY REFERENCES games(game_id),
    final_away_mom  INTEGER NOT NULL,
    final_home_mom  INTEGER NOT NULL,
    total_plays     INTEGER,
    total_teamed    INTEGER,
    computed_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id         TEXT NOT NULL REFERENCES games(game_id),
    alert_type      TEXT NOT NULL,
    away_momentum   INTEGER NOT NULL,
    home_momentum   INTEGER NOT NULL,
    away_score      INTEGER NOT NULL,
    home_score      INTEGER NOT NULL,
    period          INTEGER,
    clock           TEXT,
    detected_at     TEXT NOT NULL,
    outcome_correct INTEGER
);

CREATE TABLE IF NOT EXISTS backfill_log (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id          TEXT NOT NULL REFERENCES games(game_id),
    total_alerts     INTEGER DEFAULT 0,
    bluffing_count   INTEGER DEFAULT 0,
    comeback_count   INTEGER DEFAULT 0,
    swing_warn_count INTEGER DEFAULT 0,
    bluff_correct    INTEGER DEFAULT 0,
    bluff_total      INTEGER DEFAULT 0,
    comeback_correct INTEGER DEFAULT 0,
    comeback_total   INTEGER DEFAULT 0,
    final_away_score INTEGER,
    final_home_score INTEGER,
    processed_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plays_game ON plays(game_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_game ON momentum_snapshots(game_id);
CREATE INDEX IF NOT EXISTS idx_alerts_game ON alerts(game_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_games_league ON games(league);
`;

let _db = null;

function getDb(path) {
  if (_db) return _db;
  _db = new Database(path || DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

function initDb(path) {
  const db = getDb(path);
  db.exec(SCHEMA);
  return db;
}

function nowIso() {
  return new Date().toISOString();
}

// ── Prepared statement cache ────────────────────────────────────────────────

const stmtCache = {};

function stmt(db, key, sql) {
  if (!stmtCache[key]) stmtCache[key] = db.prepare(sql);
  return stmtCache[key];
}

// ── Game operations ─────────────────────────────────────────────────────────

function upsertGame(db, game) {
  const s = stmt(
    db,
    'upsertGame',
    `INSERT INTO games (
      game_id, league, game_date, status, away_abbr, home_abbr,
      away_id, home_id, away_name, home_name, away_color, home_color,
      away_score, home_score, period, clock, network, venue,
      short_name, name, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(game_id) DO UPDATE SET
      status=excluded.status, away_score=excluded.away_score,
      home_score=excluded.home_score, period=excluded.period,
      clock=excluded.clock, updated_at=excluded.updated_at`,
  );
  s.run(
    game.id, game.league, game.gameDate || '',
    game.status, game.awayAbbr, game.homeAbbr,
    game.awayId, game.homeId,
    game.awayName || '', game.homeName || '',
    game.awayColor || '', game.homeColor || '',
    game.awayScore || 0, game.homeScore || 0,
    game.period, game.clock,
    game.network || '', game.venue || '',
    game.shortName || '', game.name || '',
    nowIso(),
  );
}

function storePlays(db, gameId, scoredPlays) {
  const s = stmt(
    db,
    'storePlays',
    `INSERT OR IGNORE INTO plays (
      game_id, play_index, period, clock, wallclock,
      team_id, team_abbr, play_text, play_type,
      score_value, shooting_play, home_score, away_score,
      possession_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertMany = db.transaction((rows) => {
    for (const row of rows) s.run(...row);
  });
  const rows = scoredPlays.map((p, idx) => [
    gameId, idx,
    p.period, p.clock, p.wallclock,
    p.teamId, p.teamAbbr, p.playText, p.playType,
    p.scoreValue, p.shootingPlay, p.homeScore, p.awayScore,
    p.possessionScore,
  ]);
  insertMany(rows);
}

function storeMomentumSnapshots(db, gameId, snapshots) {
  db.prepare('DELETE FROM momentum_snapshots WHERE game_id = ?').run(gameId);
  const s = stmt(
    db,
    'storeSnap',
    `INSERT INTO momentum_snapshots (
      game_id, snapshot_index, away_momentum, home_momentum,
      period, clock, wallclock, home_score, away_score, captured_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertMany = db.transaction((rows) => {
    for (const row of rows) s.run(...row);
  });
  insertMany(snapshots);
}

function storeGameMomentum(db, gameId, awayMom, homeMom, totalPlays, totalTeamed) {
  const s = stmt(
    db,
    'storeGameMom',
    `INSERT INTO game_momentum (game_id, final_away_mom, final_home_mom, total_plays, total_teamed, computed_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(game_id) DO UPDATE SET
      final_away_mom=excluded.final_away_mom, final_home_mom=excluded.final_home_mom,
      total_plays=excluded.total_plays, total_teamed=excluded.total_teamed,
      computed_at=excluded.computed_at`,
  );
  s.run(gameId, awayMom, homeMom, totalPlays, totalTeamed, nowIso());
}

function storeAlert(db, gameId, alertType, awayMom, homeMom, awayScore, homeScore, period, clock) {
  const s = stmt(
    db,
    'storeAlert',
    `INSERT INTO alerts (game_id, alert_type, away_momentum, home_momentum,
      away_score, home_score, period, clock, detected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  s.run(gameId, alertType, awayMom, homeMom, awayScore, homeScore, period, clock, nowIso());
}

function storeBackfillLog(db, log) {
  const s = stmt(
    db,
    'storeBackfillLog',
    `INSERT INTO backfill_log (
      game_id, total_alerts, bluffing_count, comeback_count, swing_warn_count,
      bluff_correct, bluff_total, comeback_correct, comeback_total,
      final_away_score, final_home_score, processed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  s.run(
    log.gameId, log.totalAlerts,
    log.bluffingCount, log.comebackCount, log.swingWarnCount,
    log.bluffCorrect, log.bluffTotal,
    log.comebackCorrect, log.comebackTotal,
    log.finalAwayScore, log.finalHomeScore,
    nowIso(),
  );
}

function hasGameMomentum(db, gameId) {
  const row = db.prepare('SELECT 1 FROM game_momentum WHERE game_id = ?').get(gameId);
  return !!row;
}

module.exports = {
  getDb,
  initDb,
  nowIso,
  upsertGame,
  storePlays,
  storeMomentumSnapshots,
  storeGameMomentum,
  storeAlert,
  storeBackfillLog,
  hasGameMomentum,
};
