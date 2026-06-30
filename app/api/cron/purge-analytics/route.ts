export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET — appelé par Vercel Cron (Authorization: Bearer CRON_SECRET), purge RGPD 13 mois
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const r = await sql`DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '13 months'`;
    return NextResponse.json({ deleted: r.rowCount });
  } catch (err) {
    console.error('Cron purge-analytics error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
