import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST /api/analytics — enregistre un événement (public, si consentement)
export async function POST(req: NextRequest) {
  try {
    const { type, payload, session_id } = await req.json();
    if (!type) return NextResponse.json({ error: 'type requis' }, { status: 400 });
    await sql`
      INSERT INTO analytics_events (type, payload, session_id)
      VALUES (${type}, ${JSON.stringify(payload||{})}, ${session_id||null})
    `;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET /api/analytics — récupère les stats (admin only)
export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const [visits, events, topProjects] = await Promise.all([
      sql`SELECT DATE(created_at) as date, COUNT(*) as count FROM analytics_events WHERE type='visit' GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`,
      sql`SELECT type, COUNT(*) as count FROM analytics_events GROUP BY type ORDER BY count DESC`,
      sql`SELECT payload->>'project' as project, COUNT(*) as count FROM analytics_events WHERE type='project_click' GROUP BY payload->>'project' ORDER BY count DESC LIMIT 5`,
    ]);
    return NextResponse.json({ visits, events, topProjects });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
