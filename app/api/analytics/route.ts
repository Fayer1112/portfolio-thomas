export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST — public, anonymous tracking (consent required client-side)
export async function POST(req: NextRequest) {
  try {
    const { type, payload, session_id } = await req.json();
    if (!type || !session_id) return NextResponse.json({ ok: false }, { status: 400 });
    // Never store IP or personal data
    await sql`
      INSERT INTO analytics_events (type, payload, session_id, created_at)
      VALUES (${type}, ${JSON.stringify(payload || {})}::jsonb, ${session_id}, NOW())
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Analytics POST error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET — admin only, aggregated stats
export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const [visits, projectViews, recent, totals] = await Promise.all([
      sql`SELECT DATE(created_at) as date, COUNT(DISTINCT session_id) as count FROM analytics_events WHERE type='visit' AND created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date ASC`,
      sql`SELECT payload->>'project' as project, COUNT(*) as count FROM analytics_events WHERE type='project_view' AND created_at > NOW() - INTERVAL '30 days' GROUP BY payload->>'project' ORDER BY count DESC LIMIT 10`,
      sql`SELECT type, payload, created_at FROM analytics_events ORDER BY created_at DESC LIMIT 50`,
      sql`SELECT COUNT(DISTINCT session_id) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as visitors_30d, COUNT(DISTINCT session_id) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as visitors_7d, COUNT(*) FILTER (WHERE type='project_view' AND created_at > NOW() - INTERVAL '30 days') as project_views_30d, COUNT(*) FILTER (WHERE type='contact_form_send' AND created_at > NOW() - INTERVAL '30 days') as contacts_30d FROM analytics_events`,
    ]);
    return NextResponse.json({ visits, projectViews, recent, totals: totals[0] });
  } catch (err) {
    console.error('Analytics GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE — RGPD: purge events older than 13 months (CNIL)
export async function DELETE(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const r = await sql`DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '13 months' RETURNING id`;
    return NextResponse.json({ deleted: r.length });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
