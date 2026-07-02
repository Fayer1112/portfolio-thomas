import type { Metadata } from "next";

const BASE = "https://www.thomas-leloup.fr";
const DESCRIPTION =
  "Thomas Leloup, Product Designer spécialisé applications métiers B2B & Design Systems (ex-développeur Full Stack). UX Research, Design Ops, accessibilité. Basé à Paris — mobilité nationale.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "Thomas Leloup — Product Designer B2B & Design Systems",
    template: "%s — Thomas Leloup",
  },
  description: DESCRIPTION,
  keywords: [
    "Product Designer",
    "UX Designer",
    "UI Designer",
    "Design System",
    "Design Ops",
    "UX Research",
    "Applications métiers B2B",
    "Accessibilité",
    "Freelance",
    "Paris",
    "Thomas Leloup",
  ],
  authors: [{ name: "Thomas Leloup", url: BASE }],
  creator: "Thomas Leloup",
  alternates: { canonical: BASE },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: BASE,
    siteName: "Thomas Leloup — Portfolio",
    title: "Thomas Leloup — Product Designer B2B & Design Systems",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Thomas Leloup — Product Designer B2B & Design Systems",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Thomas Leloup",
  jobTitle: "Product Designer",
  description: DESCRIPTION,
  url: BASE,
  email: "leloupthomas.pro@gmail.com",
  image: `${BASE}/opengraph-image`,
  address: { "@type": "PostalAddress", addressLocality: "Paris", addressCountry: "FR" },
  sameAs: ["https://www.linkedin.com/in/thomas--leloup/"],
  knowsAbout: [
    "UX Design",
    "UI Design",
    "Design System",
    "Design Ops",
    "UX Research",
    "Accessibilité numérique",
    "Applications métiers B2B",
    "Prototypage",
    "Figma",
  ],
  worksFor: { "@type": "Organization", name: "Jauno Studio" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "Digital Campus Paris" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
