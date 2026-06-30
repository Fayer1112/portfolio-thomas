import ClientPage from '../../client-page';
import sql from '@/lib/db';

export const revalidate = 0;

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
    console.error('Erreur getData projets/[id]:', error);
    return { projets: [], temoignages: [] };
  }
}

// Le composant client (ssr:false) détecte /projets/[id] dans l'URL au mount
// et affiche automatiquement la bonne fiche projet — pas besoin de passer l'id en prop.
export default async function ProjectRoute() {
  const initialData = await getData();
  return <ClientPage initialData={initialData} />;
}
