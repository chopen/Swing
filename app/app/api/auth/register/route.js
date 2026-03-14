import { NextResponse } from 'next/server';
import { findUserByPhone, createUser } from '../../../../lib/users';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { phone } = await request.json();

    if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    // Check if user already exists
    const existing = await findUserByPhone(cleanPhone);
    if (existing) {
      return NextResponse.json({ userId: existing.id, existing: true });
    }

    const user = await createUser(cleanPhone);

    return NextResponse.json({ userId: user.id });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
