/** Resolve team IDs to NCAA Division I conference names. */

let cachedTeamToConf = null;
let cacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch team ID → conference name mapping from ESPN groups API.
 * Returns { teamId: conferenceName } for all NCAA D1 teams.
 * Cached for 24 hours.
 */
async function fetchTeamConferenceMap() {
  const now = Date.now();
  if (cachedTeamToConf && now - cacheTime < CACHE_TTL) {
    return cachedTeamToConf;
  }

  const res = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/groups'
  );
  const data = await res.json();

  const map = {};
  const d1 = (data.groups || []).find((g) => g.name === 'NCAA Division I');
  if (d1?.children) {
    for (const conf of d1.children) {
      for (const team of conf.teams || []) {
        if (team.id) {
          map[team.id] = conf.name;
        }
      }
    }
  }

  cachedTeamToConf = map;
  cacheTime = now;
  return map;
}

/**
 * Look up conference name for a team by ESPN team ID.
 * Returns null if not found (non-D1 team).
 */
async function getConferenceName(teamId) {
  if (!teamId) return null;
  const map = await fetchTeamConferenceMap();
  return map[teamId] || null;
}

module.exports = { fetchTeamConferenceMap, getConferenceName };
