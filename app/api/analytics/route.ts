export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const PERIODS = {
  day:   { range: '24 hours',  prev: '48 hours',  trunc: 'hour' },
  week:  { range: '7 days',    prev: '14 days',   trunc: 'day' },
  month: { range: '30 days',   prev: '60 days',   trunc: 'day' },
  year:  { range: '12 months', prev: '24 months', trunc: 'month' },
} as const;

type Period = keyof typeof PERIODS;

// POST — public, anonymous tracking (consent required client-side)
export async function POST(req: NextRequest) {
  try {
    const { type, payload, session_id } = await req.json();
    if (!type || !session_id) return NextResponse.json({ ok: false }, { status: 400 });
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

// GET — admin only, full analytics with period selector
export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const raw = req.nextUrl.searchParams.get('period') ?? 'month';
  const period: Period = raw in PERIODS ? (raw as Period) : 'month';
  const cfg = PERIODS[period];

  try {
    const [visits, projectViews, recent, totals, prevTotals, ctaClicks] = await Promise.all([
      // Time series grouped by period unit (hour/day/month)
      sql`
        SELECT DATE_TRUNC(${cfg.trunc}, created_at) AS ts,
               COUNT(DISTINCT session_id) AS count
        FROM analytics_events
        WHERE type = 'visit'
          AND created_at > NOW() - ${cfg.range}::interval
        GROUP BY ts ORDER BY ts ASC`,

      // Top projects by view count
      sql`
        SELECT payload->>'project' AS project, COUNT(*) AS count
        FROM analytics_events
        WHERE type = 'project_view'
          AND created_at > NOW() - ${cfg.range}::interval
        GROUP BY payload->>'project'
        ORDER BY count DESC LIMIT 8`,

      // Recent activity feed
      sql`
        SELECT type, payload, created_at
        FROM analytics_events
        ORDER BY created_at DESC LIMIT 20`,

      // KPIs — current period
      sql`
        SELECT
          COUNT(DISTINCT session_id)                                                     AS visitors,
          COUNT(*) FILTER (WHERE type = 'project_view')                                 AS project_views,
          COUNT(DISTINCT session_id) FILTER (WHERE type = 'project_view')               AS engaged_sessions,
          COUNT(*) FILTER (WHERE type = 'contact_form_send')                            AS contacts,
          COUNT(*) FILTER (WHERE type = 'contact_click')                                AS contact_clicks,
          COUNT(*) FILTER (WHERE type = 'cta_click'
                           AND payload->>'label' IN ('hero_cv','nav_cv','mobile_cv'))   AS cv_clicks
        FROM analytics_events
        WHERE created_at > NOW() - ${cfg.range}::interval`,

      // KPIs — previous period (for trend %)
      sql`
        SELECT COUNT(DISTINCT session_id) AS visitors
        FROM analytics_events
        WHERE type = 'visit'
          AND created_at > NOW() - ${cfg.prev}::interval
          AND created_at <= NOW() - ${cfg.range}::interval`,

      // CTA click breakdown
      sql`
        SELECT payload->>'label' AS label, COUNT(*) AS count
        FROM analytics_events
        WHERE type = 'cta_click'
          AND created_at > NOW() - ${cfg.range}::interval
        GROUP BY label ORDER BY count DESC`,
    ]);

    return NextResponse.json({ visits, projectViews, recent, totals: totals[0], prevTotals: prevTotals[0], ctaClicks, period });
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
