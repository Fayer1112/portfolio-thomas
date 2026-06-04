import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { tagSchema } from '@/lib/validators';

export async function GET() {
  try {
    const tags = await sql`SELECT * FROM tags ORDER BY name`;
    return NextResponse.json(tags);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const parsed = tagSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten() }, { status: 422 });
  const { id, name, color } = parsed.data;
  try {
    await sql`INSERT INTO tags (id, name, color) VALUES (${id}, ${name}, ${color}) ON CONFLICT (id) DO UPDATE SET name=${name}, color=${color}`;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await req.json();
  try {
    await sql`DELETE FROM tags WHERE id=${id}`;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
