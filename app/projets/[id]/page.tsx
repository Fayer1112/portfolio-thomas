import type { Metadata } from 'next';
import ClientPage from '../../client-page';
import sql from '@/lib/db';

const BASE = 'https://www.thomas-leloup.fr';
export const revalidate = 0;

type ProjectRow = {
  id: string;
  title: string;
  subtitle?: string;
  context?: string;
  category?: string;
  role?: string;
  client?: string;
  year?: string;
  cover_image?: string | null;
  confidential?: boolean;
};

async function getProject(id: string): Promise<ProjectRow | null> {
  try {
    const rows = (await sql`SELECT * FROM projects WHERE id = ${id} LIMIT 1`) as ProjectRow[];
    return rows[0] || null;
  } catch (err) {
    console.error('getProject error:', err);
    return null;
  }
}

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
      sql`SELECT * FROM testimonials ORDER BY display_order, created_at`,
    ]);
    return { projets, temoignages };
  } catch (error) {
    console.error('Erreur getData projets/[id]:', error);
    return { projets: [], temoignages: [] };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getProject(id);
  if (!p) {
    return { title: 'Projet', description: 'Projet du portfolio de Thomas Leloup.' };
  }
  const title = `${p.title} — ${p.subtitle || p.category || 'Étude de cas'}`;
  const description =
    (p.context ? p.context.slice(0, 155).trim() : `${p.role || 'Product Designer'} · ${p.client || ''} — étude de cas UX/UI par Thomas Leloup.`).replace(/\s+\S*$/, '') + '…';
  const url = `${BASE}/projets/${p.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: 'Thomas Leloup — Portfolio',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ProjectRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [initialData, project] = await Promise.all([getData(), getProject(id)]);

  const creativeWorkJsonLd = project
    ? {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: project.title,
        headline: project.subtitle || project.title,
        abstract: project.context || undefined,
        url: `${BASE}/projets/${project.id}`,
        genre: project.category || undefined,
        dateCreated: project.year || undefined,
        creator: { '@type': 'Person', name: 'Thomas Leloup', url: BASE },
        about: project.client ? `Client : ${project.client}` : undefined,
      }
    : null;

  return (
    <>
      {creativeWorkJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(creativeWorkJsonLd) }}
        />
      )}
      <ClientPage initialData={initialData} />
    </>
  );
}
