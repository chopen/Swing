import { sql } from '@vercel/postgres';

export async function findUserByPhone(phone) {
  const { rows } = await sql`
    SELECT id, phone, first_name AS "firstName", last_name AS "lastName",
           email, activated, created_at AS "createdAt"
    FROM users WHERE phone = ${phone}
  `;
  return rows[0] || null;
}

export async function findUserById(id) {
  const { rows } = await sql`
    SELECT id, phone, first_name AS "firstName", last_name AS "lastName",
           email, activated, created_at AS "createdAt"
    FROM users WHERE id = ${id}::uuid
  `;
  return rows[0] || null;
}

export async function createUser(phone) {
  const { rows } = await sql`
    INSERT INTO users (phone)
    VALUES (${phone})
    RETURNING id, phone, first_name AS "firstName", last_name AS "lastName",
              email, activated, created_at AS "createdAt"
  `;
  return rows[0];
}

export async function updateUser(id, data) {
  const { rows } = await sql`
    UPDATE users
    SET first_name = COALESCE(${data.firstName ?? null}, first_name),
        last_name  = COALESCE(${data.lastName ?? null}, last_name),
        email      = COALESCE(${data.email ?? null}, email),
        activated  = COALESCE(${data.activated ?? null}, activated)
    WHERE id = ${id}::uuid
    RETURNING id, phone, first_name AS "firstName", last_name AS "lastName",
              email, activated, created_at AS "createdAt"
  `;
  return rows[0] || null;
}
