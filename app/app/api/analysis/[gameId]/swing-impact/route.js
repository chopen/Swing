/** /api/analysis/[gameId]/swing-impact?date=YYYYMMDD&direction=up|down|both — Player-level swing impact. */

const {
  fetchNbaScoreboard,
  fetchCbbScoreboard,
  fetchGameSummary,
  parseScoreboardEvent,
  getPlaysFromSummary,
} = require('../../../../../lib/espn');

const {
  findInflections,
  buildRoster,
  replayMomentumWithPlayers,
  computeSwingImpact,
} = require('../../../../../lib/swing-impact');

export const dynamic = 'force-dynamic';

async function findGameAndSummary(gameId, dateStr) {
  const [nbaEvents, cbbEvents] = await Promise.all([
    fetchNbaScoreboard(dateStr || undefined),
    fetchCbbScoreboard(dateStr || undefined),
  ]);

  const allEvents = [
    ...nbaEvents.map((e) => ({ ...e, league: 'NBA' })),
    ...cbbEvents.map((e) => ({ ...e, league: 'CBB' })),
  ];

  const event = allEvents.find((e) => e.id === gameId);
  if (!event) return null;

  const game = parseScoreboardEvent(event, event.league);
  const summary = await fetchGameSummary(gameId, game.league);
  return { game, summary };
}

export async function GET(request, { params }) {
  try {
    const { gameId } = await params;
    const url = new URL(request.url);
    const dateStr = url.searchParams.get('date') || null;
    const direction = url.searchParams.get('direction') || 'both';

    const result = await findGameAndSummary(gameId, dateStr);
    if (!result) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    const { game, summary } = result;
    const plays = getPlaysFromSummary(summary);
    if (!plays.length) {
      return Response.json({ error: 'No play-by-play data available' }, { status: 404 });
    }

    const roster = buildRoster(summary);
    const { chartAway, chartHome, batchPlays } = replayMomentumWithPlayers(
      plays, game.awayAbbr, game.homeAbbr, game.awayId, game.homeId, game.league, roster
    );

    if (chartAway.length < 3 || chartHome.length < 3) {
      return Response.json({ error: 'Insufficient momentum data' }, { status: 404 });
    }

    let awayInflections = findInflections(chartAway, game.league);
    let homeInflections = findInflections(chartHome, game.league);

    if (direction === 'up') {
      awayInflections = awayInflections.filter((i) => i.upward);
      homeInflections = homeInflections.filter((i) => i.upward);
    } else if (direction === 'down') {
      awayInflections = awayInflections.filter((i) => !i.upward);
      homeInflections = homeInflections.filter((i) => !i.upward);
    }

    const awayImpact = computeSwingImpact(awayInflections, batchPlays, game.awayAbbr, game.league);
    const homeImpact = computeSwingImpact(homeInflections, batchPlays, game.homeAbbr, game.league);

    return Response.json({
      gameId,
      name: game.name,
      league: game.league,
      status: game.status,
      score: `${game.awayAbbr} ${game.awayScore} - ${game.homeAbbr} ${game.homeScore}`,
      direction,
      away: {
        team: game.awayAbbr,
        totalSwings: awayInflections.length,
        upSwings: awayInflections.filter((i) => i.upward).length,
        downSwings: awayInflections.filter((i) => !i.upward).length,
        leaderboard: awayImpact.leaderboard,
        swings: awayImpact.swings,
      },
      home: {
        team: game.homeAbbr,
        totalSwings: homeInflections.length,
        upSwings: homeInflections.filter((i) => i.upward).length,
        downSwings: homeInflections.filter((i) => !i.upward).length,
        leaderboard: homeImpact.leaderboard,
        swings: homeImpact.swings,
      },
    });
  } catch (err) {
    console.error('Swing impact error:', err);
    return Response.json({ error: 'Swing impact analysis failed' }, { status: 500 });
  }
}
