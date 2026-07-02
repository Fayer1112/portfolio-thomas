import type { MetadataRoute } from 'next';
import sql from '@/lib/db';

const BASE = 'https://www.thomas-leloup.fr';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let projets: { id: string; updated_at?: string }[] = [];
  try {
    projets = (await sql`SELECT id, updated_at FROM projects ORDER BY display_order`) as {
      id: string;
      updated_at?: string;
    }[];
  } catch (err) {
    console.error('sitemap: échec de récupération des projets', err);
  }

  const projectUrls: MetadataRoute.Sitemap = projets.map((p) => ({
    url: `${BASE}/projets/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    ...projectUrls,
  ];
}
