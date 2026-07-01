export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Proxy le PDF du CV depuis Cloudinary — évite les problèmes d'accès direct
// et sert le fichier sous le propre domaine du portfolio
export async function GET() {
  try {
    const [row] = await sql`SELECT value FROM site_settings WHERE key = 'cv_url'`;
    const storedUrl: string = row?.value || '';

    if (!storedUrl) {
      return new NextResponse('Aucun CV configuré', { status: 404 });
    }

    // Normalise l'URL : les PDFs Cloudinary doivent passer par raw/upload
    const url = storedUrl.replace('/image/upload/', '/raw/upload/');

    const res = await fetch(url, {
      headers: { 'User-Agent': 'portfolio-thomas/cv-proxy' },
      // next.js : pas de cache pour toujours servir la dernière version
      cache: 'no-store',
    });

    if (!res.ok) {
      return new NextResponse(`CV non disponible (${res.status})`, { status: res.status });
    }

    const data = await res.arrayBuffer();
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="CV_Thomas_Leloup.pdf"',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('CV proxy error:', err);
    return new NextResponse('Erreur serveur', { status: 500 });
  }
}
