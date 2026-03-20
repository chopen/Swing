/** DB access layer for player swing impact data. */

import { sql } from './db.js';

/**
 * Record swing impact for all players in a team's game.
 */
export async function recordPlayerSwingImpact(gameId, gameDate, league, team, leaderboard, inflectionCounts) {
  for (const player of leaderboard) {
    await sql`
      INSERT INTO player_swing_impact (
        game_id, game_date, league, team, athlete_id, player_name,
        total_impact, swing_appearances, positive_plays, negative_plays, efficiency,
        total_swings, up_swings, down_swings
      ) VALUES (
        ${gameId}, ${gameDate}, ${league}, ${team}, ${player.athleteId},
        ${player.player}, ${player.totalImpact}, ${player.swingAppearances},
        ${player.positivePlays}, ${player.negativePlays}, ${player.efficiency},
        ${inflectionCounts.total}, ${inflectionCounts.up}, ${inflectionCounts.down}
      )
      ON CONFLICT (game_id, team, player_name) DO UPDATE SET
        athlete_id = COALESCE(EXCLUDED.athlete_id, player_swing_impact.athlete_id),
        total_impact = EXCLUDED.total_impact,
        swing_appearances = EXCLUDED.swing_appearances,
        positive_plays = EXCLUDED.positive_plays,
        negative_plays = EXCLUDED.negative_plays,
        efficiency = EXCLUDED.efficiency,
        total_swings = EXCLUDED.total_swings,
        up_swings = EXCLUDED.up_swings,
        down_swings = EXCLUDED.down_swings
    `;
  }
}

/**
 * Check if swing impact has already been recorded for a game.
 */
export async function hasSwingImpact(gameId) {
  const { rows } = await sql`
    SELECT 1 FROM player_swing_impact WHERE game_id = ${gameId} LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Get aggregated player swing impact across games for a team.
 */
export async function getTeamPlayerImpact(team, league, limit = 20) {
  const { rows } = await sql`
    SELECT player_name AS "player",
           athlete_id AS "athleteId",
           COUNT(*) AS "gamesPlayed",
           SUM(total_impact) AS "cumulativeImpact",
           ROUND(AVG(total_impact)::numeric, 1) AS "avgImpactPerGame",
           SUM(swing_appearances) AS "totalSwingAppearances",
           SUM(positive_plays) AS "totalPositive",
           SUM(negative_plays) AS "totalNegative",
           ROUND(AVG(efficiency)::numeric, 1) AS "avgEfficiency"
    FROM player_swing_impact
    WHERE team = ${team} AND league = ${league}
    GROUP BY player_name, athlete_id
    ORDER BY SUM(total_impact) DESC
    LIMIT ${limit}
  `;
  return rows;
}

/**
 * Get a specific player's game-by-game swing impact history.
 */
export async function getPlayerHistory(playerName, league, limit = 20) {
  const { rows } = await sql`
    SELECT game_id AS "gameId", game_date AS "gameDate", team, league,
           total_impact AS "totalImpact", swing_appearances AS "swingAppearances",
           positive_plays AS "positivePlays", negative_plays AS "negativePlays",
           efficiency, total_swings AS "totalSwings",
           up_swings AS "upSwings", down_swings AS "downSwings"
    FROM player_swing_impact
    WHERE player_name = ${playerName} AND league = ${league}
    ORDER BY game_date DESC
    LIMIT ${limit}
  `;
  return rows;
}

/**
 * Get top swing impact players across all teams in a league.
 */
export async function getLeagueLeaderboard(league, minGames = 5, limit = 25) {
  const { rows } = await sql`
    SELECT player_name AS "player",
           athlete_id AS "athleteId",
           team,
           COUNT(*) AS "gamesPlayed",
           SUM(total_impact) AS "cumulativeImpact",
           ROUND(AVG(total_impact)::numeric, 1) AS "avgImpactPerGame",
           SUM(positive_plays) AS "totalPositive",
           SUM(negative_plays) AS "totalNegative",
           ROUND(AVG(efficiency)::numeric, 1) AS "avgEfficiency"
    FROM player_swing_impact
    WHERE league = ${league}
    GROUP BY player_name, athlete_id, team
    HAVING COUNT(*) >= ${minGames}
    ORDER BY AVG(total_impact) DESC
    LIMIT ${limit}
  `;
  return rows;
}
