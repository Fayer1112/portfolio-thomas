import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { projectSchema } from '@/lib/validators';

// GET /api/projects — public
export async function GET() {
  try {
    const projects = await sql`
      SELECT p.*, 
        COALESCE(
          json_agg(pt.tag_id ORDER BY pt.tag_id) FILTER (WHERE pt.tag_id IS NOT NULL),
          '[]'
        ) as tags
      FROM projects p
      LEFT JOIN project_tags pt ON pt.project_id = p.id
      GROUP BY p.id
      ORDER BY p.display_order, p.created_at
    `;
    return NextResponse.json(projects);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/projects — admin only
export async function POST(req: NextRequest) {
  if (!requireAuth(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const body = await req.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 422 });
  }
  const p = parsed.data;
  try {
    await sql`
      INSERT INTO projects (id, title, subtitle, category, year, role, duration,
        platform, client, cover_type, context, problematique, objectifs,
        process_steps, metrics, tools, plus_values, featured, confidential, display_order)
      VALUES (${p.id}, ${p.title}, ${p.subtitle||null}, ${p.category||'Case Study'},
        ${p.year||null}, ${p.role||null}, ${p.duration||null}, ${p.platform||null},
        ${p.client||null}, ${p.cover_type||'cabin'}, ${p.context||null},
        ${p.problematique||null}, ${JSON.stringify(p.objectifs||[])},
        ${JSON.stringify(p.process_steps||[])}, ${JSON.stringify(p.metrics||[])},
        ${JSON.stringify(p.tools||[])}, ${JSON.stringify(p.plus_values||[])},
        ${p.featured||false}, ${p.confidential||false}, ${p.display_order||99})
    `;
    if (p.tags?.length) {
      for (const tagId of p.tags) {
        await sql`INSERT INTO project_tags (project_id, tag_id) VALUES (${p.id}, ${tagId}) ON CONFLICT DO NOTHING`;
      }
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
