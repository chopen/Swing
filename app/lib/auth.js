import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'swing-dev-secret';
const COOKIE_NAME = 'swing-auth';
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export function createToken(user) {
  return jwt.sign(
    { userId: user.id, phone: user.phone, firstName: user.firstName },
    JWT_SECRET,
    { expiresIn: MAX_AGE }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function setAuthCookie(cookieStore, token) {
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: '/',
    maxAge: MAX_AGE,
    sameSite: 'lax',
  });
}

export function clearAuthCookie(cookieStore) {
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
}

export function getAuthCookie(cookieStore) {
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value || null;
}

export { COOKIE_NAME };
