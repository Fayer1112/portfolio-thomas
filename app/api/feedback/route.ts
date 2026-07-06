export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST — public : avis anonyme volontaire (note 1-5 + message facultatif)
export async function POST(req: NextRequest) {
  try {
    const { rating, message, session_id } = await req.json();
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: 'Note invalide' }, { status: 422 });
    }
    const msg = typeof message === 'string' ? message.trim().slice(0, 1200) : null;
    await sql`
      INSERT INTO feedbacks (rating, message, session_id)
      VALUES (${r}, ${msg || null}, ${session_id || null})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Feedback POST error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET — admin : liste + moyenne
export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const [items, stats] = await Promise.all([
      sql`SELECT id, rating, message, created_at FROM feedbacks ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT COUNT(*)::int AS total, ROUND(AVG(rating), 2)::float AS average FROM feedbacks`,
    ]);
    return NextResponse.json({ items, total: stats[0].total, average: stats[0].average });
  } catch (err) {
    console.error('Feedback GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE — admin : suppression d'un avis (spam)
export async function DELETE(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const id = Number(req.nextUrl.searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 422 });
    await sql`DELETE FROM feedbacks WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
