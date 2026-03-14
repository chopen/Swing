import { sql } from '@vercel/postgres';

export async function findSubscriptionsByUser(userId) {
  const { rows } = await sql`
    SELECT user_id AS "userId", game_id AS "gameId", created_at AS "createdAt"
    FROM subscriptions WHERE user_id = ${userId}::uuid
  `;
  return rows;
}

export async function findSubscription(userId, gameId) {
  const { rows } = await sql`
    SELECT user_id AS "userId", game_id AS "gameId", created_at AS "createdAt"
    FROM subscriptions WHERE user_id = ${userId}::uuid AND game_id = ${gameId}
  `;
  return rows[0] || null;
}

export async function addSubscription(userId, gameId) {
  await sql`
    INSERT INTO subscriptions (user_id, game_id)
    VALUES (${userId}::uuid, ${gameId})
    ON CONFLICT (user_id, game_id) DO NOTHING
  `;
}

export async function removeSubscription(userId, gameId) {
  await sql`
    DELETE FROM subscriptions
    WHERE user_id = ${userId}::uuid AND game_id = ${gameId}
  `;
}

export async function readSubscriptions() {
  const { rows } = await sql`
    SELECT user_id AS "userId", game_id AS "gameId", created_at AS "createdAt"
    FROM subscriptions
  `;
  return rows;
}
