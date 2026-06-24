import ClientPage from './client-page';
import sql from '@/lib/db';

export const revalidate = 0; // désactive le cache statique

async function getData() {
  try {
    const [projets, temoignages] = await Promise.all([
      sql`
        SELECT p.*, 
          COALESCE(
            json_agg(pt.tag_id ORDER BY pt.tag_id) FILTER (WHERE pt.tag_id IS NOT NULL),
            '[]'
          ) as tags
        FROM projects p
        LEFT JOIN project_tags pt ON pt.project_id = p.id
        GROUP BY p.id
        ORDER BY p.display_order, p.created_at
      `,
      sql`SELECT * FROM testimonials ORDER BY display_order, created_at`
    ]);
    return { projets, temoignages };
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    return { projets: [], temoignages: [] };
  }
}

export default async function Home() {
  const initialData = await getData();
  return <ClientPage initialData={initialData} />;
}