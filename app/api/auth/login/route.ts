import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 });
    }

    const rows = await sql`SELECT password_hash FROM admin_users WHERE username='thomas' LIMIT 1`;
    if (!rows[0]) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, rows[0].password_hash as string);
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
    }

    const token = signToken({ user: 'thomas' });
    return NextResponse.json({ token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
