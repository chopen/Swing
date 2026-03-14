import { sql } from '@vercel/postgres';

export async function wasAlertSentRecently(userId, gameId, alertType, withinMs = 3 * 60 * 1000) {
  const intervalSeconds = Math.floor(withinMs / 1000);
  const { rows } = await sql`
    SELECT 1 FROM alert_history
    WHERE user_id = ${userId}::uuid
      AND game_id = ${gameId}
      AND alert_type = ${alertType}
      AND sent_at > now() - make_interval(secs => ${intervalSeconds})
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function recordAlert(userId, gameId, alertType) {
  await sql`
    INSERT INTO alert_history (user_id, game_id, alert_type)
    VALUES (${userId}::uuid, ${gameId}, ${alertType})
  `;
}
