'use client';

import dynamic from 'next/dynamic';

const Portfolio = dynamic(() => import('@/components/Portfolio'), {
  ssr: false,
  loading: () => null,
});

type Props = {
  initialData?: Record<string, unknown>;
};

export default function ClientPage({ initialData = {} }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = Portfolio as any;
  return <P initialData={initialData} />;
}