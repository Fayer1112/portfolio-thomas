'use client';

import dynamic from 'next/dynamic';

const Portfolio = dynamic(() => import('@/components/Portfolio'), {
  ssr: false,
});

export default function ClientPage({ initialData }: { initialData: object }) {
  return <Portfolio initialData={initialData} />;
}