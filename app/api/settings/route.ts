export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const rows = await sql`SELECT key, value FROM site_settings`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: 'Clé manquante' }, { status: 400 });
  try {
    await sql`
      INSERT INTO site_settings (key, value, updated_at)
      VALUES (${key}, ${value || ''}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value || ''}, updated_at = NOW()
    `;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
