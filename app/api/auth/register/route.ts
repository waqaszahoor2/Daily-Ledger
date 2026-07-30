// ============================================================
// DailyLedger — app/api/auth/register/route.ts
// Server route for direct email + password registration
// ============================================================

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const userId = `user_${Buffer.from(cleanEmail).toString('base64url')}`;

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        name: name?.trim() || cleanEmail.split('@')[0],
      },
    });
  } catch (err) {
    console.error('Register route error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
