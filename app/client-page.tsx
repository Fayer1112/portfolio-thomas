'use client';

import Portfolio from '@/components/Portfolio';

type Props = {
  initialData?: Record<string, unknown>;
  initialView?: string;
  initialProjectId?: string;
};

// Import direct (plus de dynamic ssr:false) : le portfolio est rendu côté serveur —
// HTML complet et stylé dès la première réponse (LCP, SEO), hydraté ensuite.
export default function ClientPage({ initialData = {}, initialView, initialProjectId }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = Portfolio as any;
  return <P initialData={initialData} initialView={initialView} initialProjectId={initialProjectId} />;
}
