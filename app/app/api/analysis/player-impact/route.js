/**
 * GET /api/analysis/player-impact?team=DUKE&league=CBB&limit=20
 * GET /api/analysis/player-impact?player=Cameron+Boozer&league=CBB
 * GET /api/analysis/player-impact?league=CBB&leaderboard=true&minGames=5&limit=25
 *
 * Aggregated player swing impact from backfilled data.
 */

import {
  getTeamPlayerImpact,
  getPlayerHistory,
  getLeagueLeaderboard,
} from '../../../../lib/player-swing';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const league = url.searchParams.get('league') || 'CBB';
    const team = url.searchParams.get('team');
    const player = url.searchParams.get('player');
    const leaderboard = url.searchParams.get('leaderboard') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '25', 10);
    const minGames = parseInt(url.searchParams.get('minGames') || '5', 10);

    // Player game-by-game history
    if (player) {
      const history = await getPlayerHistory(player, league, limit);
      return Response.json({ player, league, games: history.length, history });
    }

    // League-wide leaderboard
    if (leaderboard) {
      const leaders = await getLeagueLeaderboard(league, minGames, limit);
      return Response.json({ league, minGames, leaderboard: leaders });
    }

    // Team player impact
    if (team) {
      const players = await getTeamPlayerImpact(team, league, limit);
      return Response.json({ team, league, players });
    }

    return Response.json(
      { error: 'Provide ?team=, ?player=, or ?leaderboard=true' },
      { status: 400 }
    );
  } catch (err) {
    console.error('Player impact error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
