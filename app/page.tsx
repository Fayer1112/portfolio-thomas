import Portfolio from '@/components/Portfolio';
import sql from '@/lib/db';

// Revalidation toutes les 60 secondes (ISR — Incremental Static Regeneration)
export const revalidate = 60;

async function getData() {
  try {
    const [projects, tags, testimonials] = await Promise.all([
      sql`
        SELECT p.*, 
          COALESCE(json_agg(pt.tag_id ORDER BY pt.tag_id) FILTER (WHERE pt.tag_id IS NOT NULL), '[]') as tags
        FROM projects p
        LEFT JOIN project_tags pt ON pt.project_id = p.id
        GROUP BY p.id
        ORDER BY p.display_order, p.created_at
      `,
      sql`SELECT * FROM tags ORDER BY name`,
      sql`SELECT * FROM testimonials ORDER BY display_order, created_at`,
    ]);
    return { projects, tags, testimonials };
  } catch (err) {
    console.error('DB Error:', err);
    return { projects: [], tags: [], testimonials: [] };
  }
}

export default async function Home() {
  const data = await getData();
  return <Portfolio initialData={data} />;
}
