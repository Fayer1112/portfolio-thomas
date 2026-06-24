export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { testimonialSchema } from '@/lib/validators';

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM testimonials ORDER BY display_order, created_at`;
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const parsed = testimonialSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten() }, { status: 422 });
  const t = parsed.data;
  try {
    await sql`
      INSERT INTO testimonials (id, name, initials, role, company, company_logo, content, display_order)
      VALUES (${t.id}, ${t.name}, ${t.initials||null}, ${t.role||null},
              ${t.company||null}, ${t.company_logo||null}, ${t.content}, ${t.display_order||99})
      ON CONFLICT (id) DO UPDATE SET
        name=${t.name}, initials=${t.initials||null}, role=${t.role||null},
        company=${t.company||null}, company_logo=${t.company_logo||null},
        content=${t.content}, display_order=${t.display_order||99}
    `;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await req.json();
  try {
    await sql`DELETE FROM testimonials WHERE id=${id}`;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
