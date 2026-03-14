import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findUserByPhone } from '../../../../lib/users';
import { createToken, setAuthCookie } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_CODE = '456789';

export async function POST(request) {
  try {
    const { phone, step, code } = await request.json();

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const user = await findUserByPhone(cleanPhone);

    if (!user) {
      return NextResponse.json({ error: 'No account found with that phone number' }, { status: 404 });
    }

    if (!user.activated) {
      return NextResponse.json({ userId: user.id, needsCompletion: true });
    }

    // Step 1: request code
    if (step === 'request') {
      // TODO: Send SMS with code via Twilio
      // For now, use default code
      return NextResponse.json({ success: true, codeSent: true });
    }

    // Step 2: verify code
    if (step === 'verify') {
      if (code !== DEFAULT_CODE) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      const token = createToken(user);
      const cookieStore = await cookies();
      setAuthCookie(cookieStore, token);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          alertBluffing: user.alertBluffing,
          alertComeback: user.alertComeback,
          alertSwingWarning: user.alertSwingWarning,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (err) {
    console.error('Signin error:', err);
    return NextResponse.json({ error: 'Sign in failed' }, { status: 500 });
  }
}
