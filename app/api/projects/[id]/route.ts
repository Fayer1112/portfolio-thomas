import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { projectSchema } from '@/lib/validators';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = projectSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten() }, { status: 422 });
  const p = parsed.data;
  try {
    await sql`
      UPDATE projects SET
        title=${p.title}, subtitle=${p.subtitle||null}, category=${p.category||null},
        year=${p.year||null}, role=${p.role||null}, duration=${p.duration||null},
        platform=${p.platform||null}, client=${p.client||null},
        cover_type=${p.cover_type||null}, context=${p.context||null},
        problematique=${p.problematique||null},
        objectifs=${JSON.stringify(p.objectifs||[])},
        process_steps=${JSON.stringify(p.process_steps||[])},
        metrics=${JSON.stringify(p.metrics||[])},
        tools=${JSON.stringify(p.tools||[])},
        plus_values=${JSON.stringify(p.plus_values||[])},
        featured=${p.featured||false}, confidential=${p.confidential||false},
        display_order=${p.display_order||99}, updated_at=NOW()
      WHERE id=${id}
    `;
    await sql`DELETE FROM project_tags WHERE project_id=${id}`;
    if (p.tags?.length) {
      for (const tagId of p.tags) {
        await sql`INSERT INTO project_tags (project_id, tag_id) VALUES (${id}, ${tagId}) ON CONFLICT DO NOTHING`;
      }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  try {
    await sql`DELETE FROM projects WHERE id=${id}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}