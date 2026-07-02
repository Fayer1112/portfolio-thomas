import { ImageResponse } from 'next/og';

export const alt = 'Thomas Leloup — Product Designer · Design Ops';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Image de partage social (LinkedIn, WhatsApp, iMessage, Twitter…) générée nativement
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background:
            'radial-gradient(1200px 600px at 15% 10%, #1a0847 0%, transparent 55%), radial-gradient(1000px 700px at 100% 100%, #130f35 0%, transparent 50%), #07080F',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Badge disponibilité */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 999, background: '#06D6A0' }} />
          <div style={{ fontSize: 24, color: '#7E7EA8', fontWeight: 600, letterSpacing: 1 }}>
            Product Designer · Design Ops · Paris
          </div>
        </div>

        {/* Nom en gradient */}
        <div
          style={{
            display: 'flex',
            fontSize: 128,
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: -3,
            background: 'linear-gradient(100deg, #FFFFFF 0%, #B79CFF 55%, #7C3AED 100%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Thomas Leloup
        </div>

        {/* Sous-titre */}
        <div style={{ display: 'flex', fontSize: 34, color: '#C8C4E8', marginTop: 24, maxWidth: 900 }}>
          Applications métiers B2B & Design Systems — la précision d'un ingénieur, l'intention d'un designer.
        </div>

        {/* Pied : domaine */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 44,
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#7C3AED', display: 'flex' }} />
          <div style={{ fontSize: 28, color: '#F0EDFF', fontWeight: 700 }}>thomas-leloup.fr</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
