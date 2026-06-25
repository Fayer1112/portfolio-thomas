import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thomas Leloup — Product Designer",
  description: "Product Designer · Design Ops · Paris. Je conçois des expériences avec la précision d'un ingénieur et l'intention d'un designer.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}