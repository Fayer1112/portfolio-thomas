import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales & confidentialité',
  description:
    "Mentions légales, hébergement et politique de confidentialité du portfolio de Thomas Leloup, Product Designer.",
  robots: { index: false, follow: true },
};

const S = {
  page: {
    minHeight: '100vh',
    background: '#07080F',
    color: '#B8B4D8',
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    padding: '80px 24px 64px',
    lineHeight: 1.75,
    fontSize: 15,
  } as React.CSSProperties,
  wrap: { maxWidth: 720, margin: '0 auto' } as React.CSSProperties,
  h1: {
    fontSize: 32,
    fontWeight: 800,
    color: '#F0EDFF',
    letterSpacing: '-0.5px',
    marginBottom: 8,
  } as React.CSSProperties,
  updated: { fontSize: 12.5, color: '#7E7EA8', marginBottom: 40 } as React.CSSProperties,
  h2: {
    fontSize: 18,
    fontWeight: 700,
    color: '#F0EDFF',
    marginTop: 40,
    marginBottom: 12,
  } as React.CSSProperties,
  a: { color: '#A78BFA', textDecoration: 'none' } as React.CSSProperties,
  back: {
    display: 'inline-block',
    marginBottom: 40,
    padding: '8px 18px',
    borderRadius: 8,
    border: '1px solid #1C1D2E',
    background: 'rgba(124,58,237,.08)',
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
  } as React.CSSProperties,
};

export default function MentionsLegales() {
  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <a href="/" style={S.back}>← Retour au portfolio</a>

        <h1 style={S.h1}>Mentions légales & confidentialité</h1>
        <p style={S.updated}>Dernière mise à jour : juillet 2026</p>

        <h2 style={S.h2}>Éditeur du site</h2>
        <p>
          Ce site est édité par <strong style={{ color: '#F0EDFF' }}>Thomas Leloup</strong>, Product
          Designer.
          <br />
          Contact : <a style={S.a} href="mailto:leloupthomas.pro@gmail.com">leloupthomas.pro@gmail.com</a>
        </p>

        <h2 style={S.h2}>Hébergement</h2>
        <p>
          Le site est hébergé par <strong style={{ color: '#F0EDFF' }}>Vercel Inc.</strong>, 440 N
          Barranca Ave #4133, Covina, CA 91723, États-Unis —{' '}
          <a style={S.a} href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>.
          Les données sont servies depuis des serveurs situés dans l'Union européenne lorsque cela est
          possible.
        </p>

        <h2 style={S.h2}>Propriété intellectuelle</h2>
        <p>
          L'ensemble des contenus de ce site (textes, visuels, études de cas, identité graphique) est la
          propriété de Thomas Leloup, sauf mention contraire. Les marques et logos cités (Air France,
          SNCF, etc.) appartiennent à leurs propriétaires respectifs et ne sont mentionnés qu'à titre de
          référence professionnelle. Certains projets sont couverts par des accords de confidentialité :
          les visuels correspondants sont volontairement floutés ou non publiés.
        </p>

        <h2 style={S.h2}>Données personnelles</h2>
        <p>
          <strong style={{ color: '#F0EDFF' }}>Formulaire de contact</strong> — les informations
          transmises (nom, e-mail, message) servent uniquement à répondre à votre demande. Elles sont
          envoyées par e-mail et ne sont pas conservées en base de données.
        </p>
        <p>
          <strong style={{ color: '#F0EDFF' }}>Mesure d'audience</strong> — ce site utilise une mesure
          d'audience développée en interne, sans cookie tiers et sans collecte de données personnelles :
          aucune adresse IP n'est enregistrée, les visites sont comptées via un identifiant de session
          anonyme et aléatoire. Cette mesure n'est activée qu'avec votre consentement, et les données
          sont automatiquement supprimées après 13 mois, conformément aux recommandations de la CNIL.
        </p>
        <p>
          <strong style={{ color: '#F0EDFF' }}>Cookies</strong> — le site ne dépose aucun cookie tiers.
          Seul votre choix de consentement est mémorisé localement dans votre navigateur.
        </p>

        <h2 style={S.h2}>Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression des
          données vous concernant. Pour l'exercer, écrivez-moi à{' '}
          <a style={S.a} href="mailto:leloupthomas.pro@gmail.com">leloupthomas.pro@gmail.com</a>. Vous
          pouvez également introduire une réclamation auprès de la{' '}
          <a style={S.a} href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a>.
        </p>
      </div>
    </main>
  );
}
