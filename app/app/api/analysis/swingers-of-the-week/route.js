/**
 * GET /api/analysis/swingers-of-the-week?date=YYYYMMDD&conference=Atlantic+Coast+Conference
 *
 * Top 3 momentum swingers per NCAA D1 conference for the Mon–Sun week
 * containing the given date. Ranked by avg weighted impact per game.
 */

import { getWeeklySwingersbyConference } from '../../../../lib/player-swing';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

/**
 * Get conference strength factors for all teams.
 */
async function getTeamConfStrengthMap() {
  const { rows } = await sql`
    SELECT DISTINCT ON (team) team, conf_strength
    FROM team_mvix
    WHERE conf_strength IS NOT NULL
    ORDER BY team, game_date DESC
  `;
  const map = {};
  rows.forEach(r => { map[r.team] = Number(r.conf_strength); });
  return map;
}

/**
 * Resolve the Monday–Sunday week window containing the given date.
 */
function getWeekBounds(dateStr) {
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  const date = new Date(`${y}-${m}-${d}T12:00:00Z`);

  const dow = date.getUTCDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;

  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - daysSinceMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(monday), end: fmt(sunday) };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const dateStr = url.searchParams.get('date');
    const conferenceFilter = url.searchParams.get('conference') || null;

    if (!dateStr || !/^\d{8}$/.test(dateStr)) {
      return Response.json(
        { error: 'Provide ?date=YYYYMMDD' },
        { status: 400 }
      );
    }

    const week = getWeekBounds(dateStr);

    // Query all players for the week, optionally filtered by conference name
    const rows = await getWeeklySwingersbyConference(week.start, week.end, conferenceFilter);
    const confStrengthMap = await getTeamConfStrengthMap();

    // Apply conference strength adjustment and re-sort
    const adjusted = rows.map(row => {
      const cs = confStrengthMap[row.team] || 1;
      const rawImpact = Number(row.avgWeightedImpact);
      return {
        player: row.player,
        athleteId: row.athleteId,
        jersey: row.jersey,
        team: row.team,
        conference: row.conference,
        gamesPlayed: Number(row.gamesPlayed),
        avgWeightedImpact: Math.round(rawImpact * cs * 10) / 10,
        rawAvgWeightedImpact: rawImpact,
        confStrength: cs,
        totalWeightedImpact: Math.round(Number(row.totalWeightedImpact) * cs * 10) / 10,
        avgEfficiency: Number(row.avgEfficiency),
        clutchGames: Number(row.clutchGames),
      };
    }).sort((a, b) => b.avgWeightedImpact - a.avgWeightedImpact);

    // Group by conference and take top 3 per conference
    const byConference = {};
    for (const row of adjusted) {
      const conf = row.conference;
      if (!conf) continue;
      if (!byConference[conf]) byConference[conf] = [];
      if (byConference[conf].length < 3) {
        const { conference: _, ...player } = row;
        byConference[conf].push(player);
      }
    }

    // Sort conferences alphabetically
    const sorted = {};
    for (const key of Object.keys(byConference).sort()) {
      sorted[key] = byConference[key];
    }

    return Response.json({
      week: { start: week.start, end: week.end },
      conferences: sorted,
    });
  } catch (err) {
    console.error('Swingers of the week error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
