import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thomas Leloup — Product Designer · Design Ops',
  description: 'Portfolio de Thomas Leloup, Product Designer orienté Design Ops basé à Paris. 4 ans d\'expérience en UX/UI, Design System, et collaboration dev.',
  keywords: ['Product Designer', 'Design Ops', 'UX/UI', 'Figma', 'Paris'],
  authors: [{ name: 'Thomas Leloup' }],
  openGraph: {
    title: 'Thomas Leloup — Product Designer · Design Ops',
    description: 'Portfolio de Thomas Leloup, Product Designer orienté Design Ops.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
