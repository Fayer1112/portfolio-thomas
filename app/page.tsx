import dynamic from 'next/dynamic';

const Portfolio = dynamic(() => import('@/components/Portfolio'), {
  ssr: false,
});

export default function Home() {
  return <Portfolio initialData={{}} />;
}