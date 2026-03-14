import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, getAuthCookie } from '../../../../lib/auth';
import { findUserById, updateUser } from '../../../../lib/users';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = getAuthCookie(cookieStore);
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { firstName, lastName, email, alertBluffing, alertComeback, alertSwingWarning } = await request.json();

    const user = await findUserById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updated = await updateUser(user.id, {
      firstName,
      lastName,
      email,
      alertBluffing,
      alertComeback,
      alertSwingWarning,
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error('Settings error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
