import React, { useState, useEffect, useCallback, useRef, useId, useImperativeHandle, Suspense, lazy } from "react";
import PlanetGL from "./space/PlanetGL";
import SunActive from "./space/SunActive";
import BlackHole from "./space/BlackHole";
import AboutScene from "./space/AboutScene";
import IgnitionLoader, { markHeroReady } from "./intro/IgnitionLoader";
import LaunchPad from "./mission/LaunchPad";
import MissionPanel from "./mission/MissionPanel";
import { mission } from "./mission/store";
import { useExploreTracker, useProjectTracker } from "./mission/trackers";
// Lazy : le back-office (~78Ko) ne se charge que quand on ouvre l'admin, pas pour les visiteurs
const AdminPage = lazy(() => import("./admin/AdminPanel"));
import { useStorage, fromDbProject, fromDbTestimonial, DEFAULT_TAGS, DEFAULT_PROJECTS, DEFAULT_TESTIMONIALS } from "./admin/shared";

const FONTS = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap";

const LOGO_SVG = `<svg width="32" height="31" viewBox="0 0 145 141" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.2424 62.3826L54.8959 107.036L44.6981 117.234L0.0446684 72.5803L10.2424 62.3826Z" fill="#FCFCFC"/><path d="M0.00135188 72.6236L72.6251 0.000149158L82.7914 10.1664L10.1676 82.7899L0.00135188 72.6236Z" fill="#FCFCFC"/><path fill-rule="evenodd" clip-rule="evenodd" d="M75.525 87.0488C62.8414 74.3653 62.8575 53.7851 75.5609 41.0816C88.2643 28.3782 108.845 28.3621 121.528 41.0457C130.303 49.8206 132.999 62.375 129.622 73.4859C128.402 79.2203 122.983 86.7874 119.893 89.5015L68.416 140.979L58.2293 130.792L92.9425 96.0792C86.5618 94.9822 80.4485 91.9723 75.525 87.0488ZM84.721 77.8528C92.3337 85.4655 104.686 85.4558 112.311 77.8312C119.935 70.2067 119.945 57.8544 112.332 50.2417C104.719 42.6291 92.3672 42.6387 84.7426 50.2633C77.118 57.8879 77.1083 70.2401 84.721 77.8528Z" fill="#750CFF"/></svg>`;



// ── Design Tokens (single source of truth for JS-side usage) ─────────────────
const TOKENS = Object.freeze({
  acc:   "var(--brand-500)",
  blue:  "var(--brand-400)",
  teal:  "var(--success)",
  amber: "var(--energy-500)",
  pink:  "var(--brand-300)",
  cyan:  "var(--brand-300)",
  orange:"var(--energy-500)",
  tx:    "var(--ink-1)",
  tx2:   "var(--ink-3)",
  bg3:   "var(--space-2)",
  bdr:   "#1C1D2E",
});


// CSS + fonts : rendus en SSR via <AppStyles/> (hoistables React 19) — plus d'injection JS.



// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const COVER_DEFS = {
  cabin:  { g1:"#050B28", g2:"#0B2E70", g3:"#1549A8" },
  skylib: { g1:"#021812", g2:"#054D3C", g3:"#0A9070" },
  ds:     { g1:"#020410", g2:"#181640", g3:"var(--brand-600)" },
  sncf:   { g1:"#180A00", g2:"#3D1800", g3:"var(--energy-800)" },
  kara:   { g1:"#0A0320", g2:"var(--brand-900)", g3:"var(--brand-600)" },
};

// ── HOOKS ─────────────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add("vis"); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".rv").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  });
}

// ── ANALYTICS — server-side, CNIL-compliant ──────────────────────────────────
function getSessionId() {
  try {
    let sid = sessionStorage.getItem("tl_sid");
    if (!sid) {
      sid = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("tl_sid", sid);
    }
    return sid;
  } catch { return "anon"; }
}

function useAnalytics(consent) {
  const [analytics, setAnalytics] = useState({ visits:[], projectViews:[], recent:[], totals:{} });
  const sessionId = useRef(getSessionId());

  const track = useCallback(async (type, data = {}) => {
    if (!consent) return;
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload: data, session_id: sessionId.current }),
      });
    } catch {}
  }, [consent]);

  // Load analytics for admin dashboard (called from Dashboard component)
  const loadAnalytics = useCallback(async (token) => {
    try {
      const r = await fetch("/api/analytics", { headers: { "Authorization": `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setAnalytics(d); }
    } catch {}
  }, []);

  return { analytics, track, loadAnalytics };
}

// ── LIGHTBOX ─────────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && idx < images.length-1) setIdx(i=>i+1);
      if (e.key === "ArrowLeft" && idx > 0) setIdx(i=>i-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [idx, onClose, images.length]);
  return (
    <div className="lb-overlay" onClick={onClose}>
      <button className="lb-close" onClick={onClose}><i className="bx bx-x"/></button>
      {idx > 0 && <button className="lb-arrow lb-prev" onClick={(e)=>{e.stopPropagation();setIdx(i=>i-1);}}>‹</button>}
      <img className="lb-img" src={images[idx]} alt={`Photo ${idx+1}`} onClick={(e)=>e.stopPropagation()}/>
      {idx < images.length-1 && <button className="lb-arrow lb-next" onClick={(e)=>{e.stopPropagation();setIdx(i=>i+1);}}>›</button>}
      {images.length > 1 && <div className="lb-counter">{idx+1} / {images.length}</div>}
    </div>
  );
}

// ── PROJECT SUB-NAV (scrollspy sticky) ───────────────────────────────────────
function ProjectSubNav({ sections }) {
  const [active, setActive] = useState(sections[0]?.id || "");
  useEffect(() => {
    const update = () => {
      const offset = 140;
      let current = sections[0]?.id || "";
      for (const s of sections) {
        const el = document.getElementById("pds-" + s.id);
        if (el && el.getBoundingClientRect().top <= offset) current = s.id;
      }
      setActive(current);
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [sections]);

  return (
    <div className="pd-subnav">
      {sections.map(s => (
        <button key={s.id} className={`pd-subnav-btn${active===s.id?" on":""}`}
          onClick={() => {
            const el = document.getElementById("pds-"+s.id);
            if (el) { const top = el.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top, behavior:"smooth" }); }
          }}>
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ── STARS + CONSTELLATION BACKGROUND ─────────────────────────────────────────
// Constellations outils design — v2 : positions dégagées du hero, formes Cursor & Layers ajoutées
const CONSTELLATIONS = [
  { x:13, y:11, scale:2.2, label:"Pen",
    pts:[[0,3],[1.2,-0.5],[3.2,-0.5],[4.4,2.2]],
    conns:[[0,1],[2,3],[0,3]], handles:[1,2] },
  { x:86, y:50, scale:2.1, label:"Component",
    pts:[[2,0],[4,2],[2,4],[0,2]],
    conns:[[0,1],[1,2],[2,3],[3,0]] },
  { x:5, y:40, scale:2, label:"Type",
    pts:[[0,0],[4,0],[2,0],[2,4.5]],
    conns:[[0,1],[2,3]] },
  { x:7, y:64, scale:1.7, label:"Frame",
    pts:[[0,0],[1.6,0],[0,1.6],[4.2,0],[5.8,0],[5.8,1.6],[0,4.4],[0,6],[1.6,6],[4.2,6],[5.8,6],[5.8,4.4]],
    conns:[[0,1],[0,2],[3,4],[4,5],[6,7],[7,8],[9,10],[10,11]] },
  { x:88, y:76, scale:1.9, label:"AutoLayout",
    pts:[[0,0],[4.5,0],[4.5,2.8],[0,2.8],[2.25,0],[2.25,2.8],[0,1.4],[4.5,1.4]],
    conns:[[0,1],[1,2],[2,3],[3,0],[4,5],[6,7]] },
  { x:46, y:14, scale:1.9, label:"Align",
    pts:[[0,2],[4,2],[2,0],[2,4],[0,0],[4,0],[0,4],[4,4]],
    conns:[[0,1],[2,3],[4,5],[6,7]] },
  { x:70, y:88, scale:1.7, label:"Grid",
    pts:[[0,0],[2,0],[4,0],[0,2],[2,2],[4,2],[0,4],[2,4],[4,4]],
    conns:[[0,2],[6,8],[0,6],[2,8],[3,5],[1,7]] },
  { x:30, y:80, scale:2, label:"Cursor",
    pts:[[0,0],[0,4.6],[1.3,3.4],[2.2,5.2],[3,4.8],[2.1,3],[3.6,2.9]],
    conns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]] },
  { x:57, y:5, scale:1.9, label:"Layers",
    pts:[[2,0],[4,1],[2,2],[0,1],[4,2.4],[2,3.4],[0,2.4],[4,3.8],[2,4.8],[0,3.8]],
    conns:[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[7,8],[8,9]] },
];

const STATIC_STARS = Object.freeze([]);

// Variantes d'ambiance du fond — chaque page projet a sa teinte et son agencement de constellations
const hexRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};
// Texte de tag : la couleur (libre, choisie en DB) éclaircie de 55% vers le blanc —
// garantit un contraste AA ≥4.5:1 sur fond sombre quelle que soit la teinte d'origine
const tagTxt = (hex) => {
  try {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c) => Math.round(c + (255 - c) * 0.55);
    return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  } catch { return "#E4E1F5"; }
};
// trailHue = teinte HSL des étoiles filantes ; scrollHue = dérive de teinte au scroll ; holes = trous noirs décoratifs
const BG_VARIANTS = {
  home:   { accent:"var(--brand-500)", hueMin:240, hueMax:305, trailHue:263, scrollHue:65, subset:[0,1,2,3,4,5,6,7,8], shift:{x:0,y:0},  flip:false },
  cabin:  { accent:"var(--brand-400)", hueMin:210, hueMax:250, trailHue:222, scrollHue:30, subset:[0,2,4,8],           shift:{x:3,y:5},  flip:true  },
  skylib: { accent:"var(--success)", hueMin:150, hueMax:195, trailHue:162, scrollHue:30, subset:[1,3,5,7],           shift:{x:6,y:8},  flip:false },
  ds:     { accent:"#5B8AF5", hueMin:215, hueMax:255, trailHue:224, scrollHue:30, subset:[1,2,5,8],           shift:{x:-4,y:10},flip:true  },
  sncf:   { accent:"var(--energy-600)", hueMin:18,  hueMax:45,  trailHue:25,  scrollHue:22, subset:[0,3,6,7],           shift:{x:8,y:-3}, flip:false },
  kara:   { accent:"var(--brand-400)", hueMin:255, hueMax:290, trailHue:262, scrollHue:40, subset:[0,1,4,7],           shift:{x:-6,y:6}, flip:true  },
};

function BgCanvas({ variant = "home" }) {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const cfg = BG_VARIANTS[variant] || BG_VARIANTS.home;
  const acc = cfg.accent;
  const accRgb = hexRgb(acc);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf, W, H, ctx;
    // dpr plafonné : des étoiles de fond n'ont pas besoin du rétina complet (÷2 de pixels sur écran 2x)
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let stars = [], shootingStars = [];
    let comet = null, satellite = null, nova = null;
    let elapsed = 0, lastTs = 0;
    // événements spatiaux aléatoires : filante isolée, pluie groupée, comète, satellite, supernova
    let nextShootAt  = 5000  + Math.random() * 6000;
    let nextShowerAt = 16000 + Math.random() * 26000;
    let nextCometAt  = 30000 + Math.random() * 45000;
    let nextSatAt    = 22000 + Math.random() * 34000;
    let nextNovaAt   = 11000 + Math.random() * 16000;
    // sensation de navigation : les étoiles dérivent lentement, cap propre à chaque visite
    const driftAngle = Math.PI * (0.9 + Math.random() * 0.08);
    const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let hueShift = 0; // dérive de teinte au fil du scroll — le fond évolue le long de la page
    let lastHue = -1;

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      hueShift = progress * cfg.scrollHue;
      // hue-rotate quantisé au degré : re-filtrer le SVG plein écran à chaque frame rame (surtout Firefox)
      const hq = Math.round(hueShift);
      if (hq !== lastHue && svgRef.current) {
        lastHue = hq;
        svgRef.current.style.filter = `hue-rotate(${hq}deg)`;
      }
    };

    const init = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      stars = Array.from({length:130}, () => {
        const depth = Math.random(); // profondeur : les proches sont plus grosses ET dérivent plus vite (parallaxe)
        return {
          x: Math.random() * W, y: Math.random() * H,
          r: 0.25 + depth * 1.3,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.9,
          bright: 0.12 + Math.random() * 0.52,
          hue: cfg.hueMin + Math.random() * (cfg.hueMax - cfg.hueMin),
          sat: 15 + Math.random() * 55,
          drift: 0.0025 + depth * depth * 0.018,
        };
      });
    };

    const spawnShoot = (wait = 0, angle) => {
      shootingStars.push({
        sx: Math.random() * W * 0.6, sy: Math.random() * H * 0.3,
        angle: angle !== undefined ? angle : Math.PI / 4 + (Math.random() - 0.5) * 0.45,
        progress: 0, wait,
        dur: 750 + Math.random() * 550,
        len: 80 + Math.random() * 90,
      });
    };

    const tick = (ts) => {
      // tunnel plein écran au-dessus → inutile de peindre les étoiles pendant ce temps
      if (document.body.classList.contains("bht-active")) { lastTs = ts; raf = requestAnimationFrame(tick); return; }
      const dt = Math.min(ts - lastTs, 50); lastTs = ts; elapsed += dt;
      ctx.clearRect(0, 0, W, H);

      // Twinkling stars + dérive de navigation (wrap sur les bords)
      const ddx = Math.cos(driftAngle) * dt, ddy = Math.sin(driftAngle) * dt;
      for (const s of stars) {
        if (!reduceMotion) {
          s.x += ddx * s.drift; s.y += ddy * s.drift;
          if (s.x < -6) s.x += W + 12; else if (s.x > W + 6) s.x -= W + 12;
          if (s.y < -6) s.y += H + 12; else if (s.y > H + 6) s.y -= H + 12;
        }
        const op = s.bright * (0.45 + 0.55 * Math.sin(elapsed * 0.001 * s.speed + s.phase));
        const h = s.hue + hueShift;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${h},${s.sat}%,88%,${op})`;
        ctx.fill();
        if (s.r > 0.9) { // subtle glow on bigger stars
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${h},70%,80%,${op * 0.12})`;
          ctx.fill();
        }
      }

      // Spawn étoile filante isolée
      if (elapsed > nextShootAt) {
        nextShootAt = elapsed + 5000 + Math.random() * 9000;
        spawnShoot(0);
      }
      // PLUIE d'étoiles filantes : salve groupée, cap commun, départs étagés
      if (!reduceMotion && elapsed > nextShowerAt) {
        nextShowerAt = elapsed + 28000 + Math.random() * 42000;
        const n = 9 + Math.floor(Math.random() * 6);
        const baseAngle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
        for (let i = 0; i < n; i++) spawnShoot(i * 240 + Math.random() * 200, baseAngle + (Math.random() - 0.5) * 0.12);
      }
      // Comète : rare, lente, longue traîne lavande
      if (!reduceMotion && !comet && elapsed > nextCometAt) {
        nextCometAt = elapsed + 55000 + Math.random() * 65000;
        const fromLeft = Math.random() < 0.5;
        comet = { sx: fromLeft ? -60 : W + 60, ex: fromLeft ? W + 60 : -60,
                  sy: H * (0.06 + Math.random() * 0.28), ey: H * (0.3 + Math.random() * 0.42),
                  bow: 30 + Math.random() * 55, len: 150 + Math.random() * 80,
                  t: 0, dur: 9000 + Math.random() * 5000 };
      }
      // Satellite : petit point lent qui traverse avec un blink
      if (!reduceMotion && !satellite && elapsed > nextSatAt) {
        nextSatAt = elapsed + 38000 + Math.random() * 48000;
        const fromLeft = Math.random() < 0.5;
        satellite = { sx: fromLeft ? -14 : W + 14, ex: fromLeft ? W + 14 : -14,
                      sy: H * (0.05 + Math.random() * 0.5), ey: H * (0.05 + Math.random() * 0.5),
                      t: 0, dur: 13000 + Math.random() * 6000 };
      }
      // Supernova : une étoile flashe puis retombe
      if (!reduceMotion && !nova && elapsed > nextNovaAt && stars.length) {
        nextNovaAt = elapsed + 15000 + Math.random() * 22000;
        nova = { star: stars[Math.floor(Math.random() * stars.length)], t: 0 };
      }

      // Draw shooting stars
      shootingStars = shootingStars.filter(ss => {
        if (ss.wait > 0) { ss.wait -= dt; return true; } // départ étagé (pluie)
        ss.progress = Math.min(1, ss.progress + dt / ss.dur);
        const p = ss.progress;
        const op = p < 0.12 ? p / 0.12 : p > 0.72 ? (1 - p) / 0.28 : 1;
        const dist = W * 0.52 * p;
        const hx = ss.sx + Math.cos(ss.angle) * dist;
        const hy = ss.sy + Math.sin(ss.angle) * dist;
        const tx = hx - Math.cos(ss.angle) * ss.len;
        const ty = hy - Math.sin(ss.angle) * ss.len;

        const th = cfg.trailHue + hueShift;
        const g = ctx.createLinearGradient(hx, hy, tx, ty);
        g.addColorStop(0,    `rgba(255,255,255,${op})`);
        g.addColorStop(0.1,  `hsla(${th},82%,86%,${op * 0.85})`);
        g.addColorStop(0.45, `hsla(${th},76%,58%,${op * 0.35})`);
        g.addColorStop(1,    `hsla(${th},80%,43%,0)`);

        ctx.save();
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty);
        ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke();

        const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 5);
        hg.addColorStop(0, `rgba(255,255,255,${op * 0.9})`);
        hg.addColorStop(0.5, `hsla(${th},80%,77%,${op * 0.4})`);
        hg.addColorStop(1, `hsla(${th},76%,58%,0)`);
        ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fillStyle = hg; ctx.fill();
        ctx.restore();
        return p < 1;
      });

      // Comète — trajectoire légèrement incurvée, tête lumineuse + longue traîne
      if (comet) {
        comet.t += dt / comet.dur;
        if (comet.t >= 1) comet = null;
        else {
          const p = comet.t;
          const op = p < 0.08 ? p / 0.08 : p > 0.85 ? (1 - p) / 0.15 : 1;
          const hx = comet.sx + (comet.ex - comet.sx) * p;
          const hy = comet.sy + (comet.ey - comet.sy) * p + Math.sin(p * Math.PI) * comet.bow;
          const ang = Math.atan2(comet.ey - comet.sy, comet.ex - comet.sx);
          const tx = hx - Math.cos(ang) * comet.len, ty = hy - Math.sin(ang) * comet.len;
          const g = ctx.createLinearGradient(hx, hy, tx, ty);
          g.addColorStop(0,   `rgba(255,255,255,${op * .95})`);
          g.addColorStop(.12, `hsla(258,90%,88%,${op * .7})`);
          g.addColorStop(.5,  `hsla(258,80%,70%,${op * .22})`);
          g.addColorStop(1,   "hsla(258,80%,60%,0)");
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty);
          ctx.strokeStyle = g; ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.stroke();
          const hg2 = ctx.createRadialGradient(hx, hy, 0, hx, hy, 9);
          hg2.addColorStop(0,  `rgba(255,255,255,${op})`);
          hg2.addColorStop(.4, `hsla(258,95%,85%,${op * .55})`);
          hg2.addColorStop(1,  "hsla(258,90%,70%,0)");
          ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI * 2); ctx.fillStyle = hg2; ctx.fill();
        }
      }

      // Satellite — point discret en ligne droite, feu clignotant rouge
      if (satellite) {
        satellite.t += dt / satellite.dur;
        if (satellite.t >= 1) satellite = null;
        else {
          const p = satellite.t;
          const x = satellite.sx + (satellite.ex - satellite.sx) * p;
          const y = satellite.sy + (satellite.ey - satellite.sy) * p;
          const op = p < 0.05 ? p / 0.05 : p > 0.95 ? (1 - p) / 0.05 : 1;
          ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(235,235,255,${op * .9})`; ctx.fill();
          const blink = Math.pow(Math.max(0, Math.sin(elapsed * 0.006)), 18);
          if (blink > 0.02) {
            ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,120,110,${op * blink * .8})`; ctx.fill();
          }
        }
      }

      // Supernova — flash bref d'une étoile existante
      if (nova) {
        nova.t += dt / 1400;
        if (nova.t >= 1) nova = null;
        else {
          const s = nova.star, k = Math.sin(nova.t * Math.PI);
          const rad = s.r * (3 + 13 * k);
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
          g.addColorStop(0,   `rgba(255,255,255,${.9 * k})`);
          g.addColorStop(.35, `hsla(${s.hue + hueShift},85%,80%,${.5 * k})`);
          g.addColorStop(1,   `hsla(${s.hue + hueShift},80%,65%,0)`);
          ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        }
      }

      raf = requestAnimationFrame(tick);
    };

    init();
    onScroll();
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => init());
    ro.observe(canvas.parentElement || document.body);

    const vis = () => { if (document.hidden) cancelAnimationFrame(raf); else { lastTs = 0; raf = requestAnimationFrame(tick); }};
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis); window.removeEventListener('scroll', onScroll); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  return (
    <div className="bg-canvas" aria-hidden="true">
      <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
      <svg ref={svgRef} width="100%" height="100%" style={{position:'absolute',inset:0}} viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="cst-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.25" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {cfg.subset.map((cstIdx, ci) => {
          const cst = CONSTELLATIONS[cstIdx];
          const sc = cst.scale || 2;
          const ax = (cfg.flip ? 90 - cst.x : cst.x) + cfg.shift.x;
          const ay = cst.y + cfg.shift.y;
          const px = i => ax + cst.pts[i][0] * sc;
          const py = i => ay + cst.pts[i][1] * sc;
          const conns = cst.conns || cst.pts.slice(0,-1).map((_,i)=>[i,i+1]);
          return (
            <g key={cstIdx} opacity=".6" filter="url(#cst-glow)" style={{animation:`cstDrift ${11 + ci * 2.3}s ${ci * 0.8}s ease-in-out infinite`}}>
              {conns.map(([a,b], li) => {
                const isHandle = cst.handles && (cst.handles.includes(a) || cst.handles.includes(b));
                return (
                  <line key={li}
                    x1={px(a)} y1={py(a)} x2={px(b)} y2={py(b)}
                    stroke={isHandle ? `rgba(${accRgb},.32)` : `rgba(${accRgb},.42)`}
                    strokeWidth={isHandle ? '.07' : '.09'}
                    strokeDasharray={isHandle ? '.3 .5' : 'none'}
                    style={{animation:`constellationDraw ${2.8 + li * 0.35}s ${ci * 0.5 + li * 0.18}s ease both`}}
                  />
                );
              })}
              {/* halo sur l'étoile-clé (premier nœud) */}
              <circle cx={px(0)} cy={py(0)} r=".85" fill={`rgba(${accRgb},.1)`}/>
              {cst.pts.map((_, pi) => {
                const isHandle = cst.handles?.includes(pi);
                const rr = isHandle ? .15 : pi === 0 ? .34 : .18 + ((pi * 29) % 3) * .05;
                return (
                  <circle key={pi}
                    cx={px(pi)} cy={py(pi)}
                    r={rr}
                    fill={isHandle ? 'none' : pi === 0 ? '#fff' : `rgba(${accRgb},.9)`}
                    stroke={`rgba(${accRgb},${isHandle ? '.5' : '.35'})`}
                    strokeWidth='.07'
                    style={{animation:`starBlink ${2.5 + pi * 0.6}s ${ci * 0.35 + pi * 0.25}s ease-in-out infinite`}}
                  />
                );
              })}
              {cst.label && <text x={ax} y={ay - 1.1} fontSize=".68" fill={`rgba(${accRgb},.24)`} fontFamily="Syne,sans-serif" letterSpacing=".18">{cst.label}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── STYLES GLOBAUX (hoistables React 19 : dédupliqués par href, rendus en SSR) ─
function AppStyles() {
  return (
    <>
      <link rel="stylesheet" href={FONTS} precedence="default"/>
          </>
  );
}


// ── FEEDBACK — petite carte bas de page : note 1-5 + avis facultatif ─────────
// Non-intrusive : n'apparaît qu'après 12s de visite ET arrivée en bas du site,
// une seule fois par visiteur (localStorage), sans fond bloquant.
function FeedbackModal({ active }) {
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const armed = useRef(false);

  useEffect(() => {
    if (!active) return;
    let seen = null;
    try { seen = localStorage.getItem("tl_feedback"); } catch {}
    if (seen) return;
    const readyAt = Date.now() + 12000;
    const onScroll = () => {
      if (armed.current || Date.now() < readyAt) return;
      const bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 140;
      if (bottom) { armed.current = true; setShow(true); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const t = setTimeout(onScroll, 12100); // couvre le cas "déjà garé en bas de page"
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(t); };
  }, [active]);

  const close = () => {
    setShow(false);
    try { localStorage.setItem("tl_feedback", "closed"); } catch {}
  };
  const send = async () => {
    if (!rating || busy) return;
    setBusy(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, message: msg, session_id: getSessionId() }),
      });
    } catch {}
    try { localStorage.setItem("tl_feedback", "sent"); } catch {}
    setSent(true);
    setTimeout(() => setShow(false), 2600);
  };

  return (
    <div className={`fbk${show ? " show" : ""}`} role="dialog" aria-label="Donner un avis" aria-hidden={!show}>
      {sent ? (
        <div className="fbk-thanks"><i className="bx bxs-heart" style={{ color:"#FF6BD3", fontSize:20 }}/>Merci pour votre retour !</div>
      ) : (
        <>
          <button className="fbk-x" onClick={close} aria-label="Fermer"><i className="bx bx-x"/></button>
          <div className="fbk-t">Un avis sur ce portfolio ?</div>
          <div className="fbk-s">Anonyme et facultatif — ça m'aide à l'améliorer.</div>
          <div className="fbk-stars" onMouseLeave={() => setHover(0)}>
            {[1,2,3,4,5].map(n => (
              <button key={n} className={`fbk-star${(hover || rating) >= n ? " on" : ""}`} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} aria-label={`${n} étoile${n>1?"s":""}`}>
                <i className={`bx ${(hover || rating) >= n ? "bxs-star" : "bx-star"}`}/>
              </button>
            ))}
          </div>
          {rating > 0 && (
            <>
              <textarea className="fbk-ta" placeholder="Un commentaire ? (facultatif)" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={1200}/>
              <button className="fbk-send" onClick={send} disabled={busy}>{busy ? "Envoi…" : "Envoyer"}</button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── COOKIE BANNER — CNIL/RGPD compliant ──────────────────────────────────────
function CookieBanner({ onAccept, onDecline }) {
  return (
    <div className="cookie" role="region" aria-label="Mesure d'audience">
      <p className="cookie-txt">
        <strong>Mesure d'audience anonyme</strong>, sans cookie tiers, conservée 13 mois. Refuser ne change rien à votre visite. <a href="/mentions-legales">En savoir plus</a>
      </p>
      <div className="cookie-btns">
        <button className="cookie-dec" onClick={onDecline}>Refuser</button>
        <button className="cookie-acc" onClick={onAccept}>Accepter</button>
      </div>
    </div>
  );
}

// ── ASTRONAUT SVG — 3D realistic bust style ─────────────────────────────────
function AstronautSVG({ size = 520, style = {} }) {
  return (
    <svg
      width={size} height={size * 1.15}
      viewBox="0 0 520 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="hero-astro"
      style={{ filter:"drop-shadow(0 32px 80px rgba(75,127,250,.25))", ...style }}
    >
      <defs>
        <radialGradient id="helmetGlow" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#C8E8FF" stopOpacity=".35"/>
          <stop offset="60%" stopColor="#6BA8D4" stopOpacity=".1"/>
          <stop offset="100%" stopColor="#1A2A4A" stopOpacity=".05"/>
        </radialGradient>
        <radialGradient id="visorGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0A0F1E"/>
          <stop offset="100%" stopColor="#050810"/>
        </radialGradient>
        <radialGradient id="visorGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1A3A6A" stopOpacity=".6"/>
          <stop offset="100%" stopColor="#050810" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="suitGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#E8F4FF"/>
          <stop offset="45%" stopColor="#C8D8EC"/>
          <stop offset="100%" stopColor="#8AA4C0"/>
        </radialGradient>
        <radialGradient id="bodyGrad" cx="35%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#D8E8F8"/>
          <stop offset="50%" stopColor="#B0C8E0"/>
          <stop offset="100%" stopColor="#6888A8"/>
        </radialGradient>
        <radialGradient id="chestGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF8800" stopOpacity=".9"/>
          <stop offset="100%" stopColor="#FF4400" stopOpacity=".2"/>
        </radialGradient>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="visorBlur" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1.5"/>
        </filter>
        <clipPath id="helmetClip">
          <ellipse cx="260" cy="195" rx="148" ry="158"/>
        </clipPath>
      </defs>

      {/* ── Atmospheric background glow ── */}
      <ellipse cx="260" cy="320" rx="220" ry="180"
        fill="none" stroke="rgba(75,127,250,.06)" strokeWidth="60"/>
      <ellipse cx="260" cy="320" rx="180" ry="140"
        fill="none" stroke="rgba(75,127,250,.04)" strokeWidth="40"/>

      {/* ── BODY / TORSO ── */}
      {/* Main suit body */}
      <path d="M60 600 Q60 440 80 400 Q120 360 180 345 L260 340 L340 345 Q400 360 440 400 Q460 440 460 600Z"
        fill="url(#bodyGrad)"/>
      {/* Suit shading right */}
      <path d="M300 345 Q380 360 430 405 Q455 440 460 600 L380 600 Q360 480 330 430 Q310 400 300 345Z"
        fill="rgba(60,80,110,.35)"/>
      {/* Suit shading left */}
      <path d="M140 360 Q100 385 80 420 Q65 460 60 600 L120 600 Q130 490 155 440 Q170 410 185 390Z"
        fill="rgba(200,230,255,.12)"/>
      {/* Suit outline */}
      <path d="M60 600 Q60 440 80 400 Q120 360 180 345 L260 340 L340 345 Q400 360 440 400 Q460 440 460 600Z"
        fill="none" stroke="rgba(140,180,220,.3)" strokeWidth="1.5"/>

      {/* ── SHOULDERS ── */}
      {/* Left shoulder */}
      <ellipse cx="105" cy="390" rx="68" ry="55"
        fill="url(#suitGrad)" opacity=".9"/>
      <ellipse cx="92" cy="378" rx="42" ry="30"
        fill="rgba(200,230,255,.2)"/>
      <ellipse cx="105" cy="390" rx="68" ry="55"
        fill="none" stroke="rgba(140,180,220,.4)" strokeWidth="1.5"/>
      {/* Right shoulder */}
      <ellipse cx="415" cy="390" rx="68" ry="55"
        fill="url(#suitGrad)" opacity=".9"/>
      <ellipse cx="402" cy="378" rx="42" ry="30"
        fill="rgba(200,230,255,.2)"/>
      <ellipse cx="415" cy="390" rx="68" ry="55"
        fill="none" stroke="rgba(140,180,220,.4)" strokeWidth="1.5"/>

      {/* ── NECK RING ── */}
      <ellipse cx="260" cy="345" rx="90" ry="22"
        fill="#8AAAC8" stroke="rgba(140,180,220,.5)" strokeWidth="1.5"/>
      <ellipse cx="260" cy="340" rx="86" ry="18"
        fill="#A0C0DC"/>
      {/* Neck ring detail lines */}
      {[0,1,2,3,4,5].map(i => (
        <line key={i}
          x1={180 + i*18} y1={332} x2={180 + i*18} y2={352}
          stroke="rgba(80,120,160,.4)" strokeWidth="1"/>
      ))}

      {/* ── CHEST PANEL ── */}
      <rect x="192" y="405" width="136" height="105" rx="12"
        fill="#1A2840" stroke="rgba(100,150,200,.4)" strokeWidth="1.5"/>
      <rect x="194" y="407" width="132" height="101" rx="10"
        fill="#0E1828"/>
      {/* Panel inner border light */}
      <rect x="196" y="409" width="128" height="97" rx="9"
        fill="none" stroke="rgba(80,140,200,.2)" strokeWidth="1"/>

      {/* Orange status light - main */}
      <rect x="208" y="422" width="38" height="28" rx="5"
        fill="url(#chestGlow)" filter="url(#softGlow)"/>
      <rect x="210" y="424" width="34" height="24" rx="4"
        fill="#FF7700" opacity=".9"/>
      <rect x="212" y="426" width="20" height="8" rx="2"
        fill="rgba(255,200,100,.5)"/>

      {/* Right panel buttons */}
      <rect x="258" y="422" width="56" height="10" rx="3"
        fill="#0A1525" stroke="rgba(60,120,180,.4)" strokeWidth="1"/>
      <rect x="260" y="424" width="18" height="6" rx="2"
        fill="#3A7AB8" opacity=".6"/>
      <rect x="282" y="424" width="12" height="6" rx="2"
        fill="#1A4A78" opacity=".5"/>
      <rect x="298" y="424" width="14" height="6" rx="2"
        fill="#2A5A90" opacity=".5"/>

      <rect x="258" y="436" width="56" height="10" rx="3"
        fill="#0A1525" stroke="rgba(60,120,180,.4)" strokeWidth="1"/>
      <circle cx="268" cy="441" r="3" fill="#FF4400" opacity=".8"/>
      <circle cx="280" cy="441" r="3" fill="#3A7AB8" opacity=".6"/>
      <circle cx="292" cy="441" r="3" fill="#2A9A50" opacity=".6"/>
      <circle cx="304" cy="441" r="3" fill="#AA7A10" opacity=".6"/>

      {/* Bottom panel strip */}
      <rect x="208" y="460" width="106" height="36" rx="5"
        fill="#0A1525" stroke="rgba(60,120,180,.3)" strokeWidth="1"/>
      {[0,1,2,3,4,5].map(i => (
        <rect key={i} x={212+i*17} y={464} width={13} height={28} rx={2}
          fill={i===2?"#1A4A78":i===4?"#2A2A10":"#0D1820"}
          opacity={i===2?.7:i===4?.5:.3}/>
      ))}

      {/* EXMO badge */}
      <rect x="340" y="415" width="58" height="28" rx="5"
        fill="#0E1828" stroke="rgba(80,130,180,.35)" strokeWidth="1"/>
      <text x="369" y="434" textAnchor="middle"
        fill="rgba(120,170,220,.6)" fontSize="9" fontFamily="monospace" fontWeight="700">EXMO</text>

      {/* ── HELMET SHELL ── */}
      <ellipse cx="260" cy="195" rx="155" ry="162"
        fill="url(#suitGrad)"/>
      {/* Helmet shading */}
      <ellipse cx="260" cy="195" rx="155" ry="162"
        fill="url(#helmetGlow)"/>
      {/* Helmet right shading */}
      <path d="M360 100 Q415 140 415 200 Q415 280 360 320 Q400 280 400 200 Q400 130 360 100Z"
        fill="rgba(60,90,130,.25)"/>
      {/* Helmet left highlight */}
      <path d="M145 120 Q110 155 110 200 Q110 255 145 290 Q120 260 118 200 Q118 148 145 120Z"
        fill="rgba(220,240,255,.15)"/>

      {/* ── VISOR ── */}
      <ellipse cx="260" cy="205" rx="118" ry="122"
        fill="url(#visorGrad)"/>
      <ellipse cx="260" cy="205" rx="118" ry="122"
        fill="url(#visorGlow)"/>
      {/* Visor depth */}
      <ellipse cx="260" cy="205" rx="114" ry="118"
        fill="#070C18"/>
      {/* Visor inner glow */}
      <ellipse cx="260" cy="215" rx="100" ry="105"
        fill="none" stroke="rgba(40,80,160,.15)" strokeWidth="12"/>

      {/* ── VISOR RING LIGHT (key feature from image) ── */}
      {/* Outer glow ring */}
      <ellipse cx="260" cy="200" rx="106" ry="110"
        fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="14"/>
      {/* Main white ring */}
      <ellipse cx="260" cy="200" rx="104" ry="108"
        fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2.5"
        style={{ filter:"drop-shadow(0 0 8px rgba(255,255,255,.4))" }}/>
      {/* Inner accent ring */}
      <ellipse cx="260" cy="200" rx="96" ry="100"
        fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1"/>

      {/* Visor reflections */}
      <ellipse cx="215" cy="155" rx="38" ry="22"
        fill="rgba(255,255,255,.07)" transform="rotate(-20 215 155)"/>
      <ellipse cx="200" cy="168" rx="14" ry="32"
        fill="rgba(255,255,255,.04)" transform="rotate(-20 200 168)"/>
      {/* Small bright reflection spot */}
      <ellipse cx="204" cy="148" rx="10" ry="6"
        fill="rgba(255,255,255,.18)" transform="rotate(-25 204 148)"/>

      {/* Visor border */}
      <ellipse cx="260" cy="205" rx="118" ry="122"
        fill="none" stroke="rgba(140,180,220,.25)" strokeWidth="2"/>

      {/* ── HELMET DETAILS ── */}
      {/* Side connectors */}
      <rect x="102" y="185" width="16" height="30" rx="4"
        fill="#8AAAC8" stroke="rgba(140,180,220,.3)" strokeWidth="1"/>
      <rect x="104" y="190" width="12" height="20" rx="2"
        fill="#6A8AAA"/>
      <rect x="402" y="185" width="16" height="30" rx="4"
        fill="#8AAAC8" stroke="rgba(140,180,220,.3)" strokeWidth="1"/>
      <rect x="404" y="190" width="12" height="20" rx="2"
        fill="#6A8AAA"/>

      {/* Top antenna */}
      <rect x="248" y="34" width="24" height="14" rx="4"
        fill="#8AAAC8" stroke="rgba(140,180,220,.35)" strokeWidth="1"/>
      <rect x="254" y="20" width="12" height="18" rx="3"
        fill="#A0C0DC" stroke="rgba(140,180,220,.3)" strokeWidth="1"/>
      <circle cx="260" cy="16" r="5"
        fill="#C0D8F0" stroke="rgba(180,210,240,.5)" strokeWidth="1"/>

      {/* Helmet outline */}
      <ellipse cx="260" cy="195" rx="155" ry="162"
        fill="none" stroke="rgba(160,200,240,.2)" strokeWidth="1.5"/>
    </svg>
  );
}


// ── PROJECT COVER SVG ─────────────────────────────────────────────────────────
// Soleil traversant l'écran — disque derrière les composants, lumière ressentie au-dessus
function SunSweep() {
  return (
    <>
      <div className="sun-layer sun-behind" aria-hidden="true"><div className="sun-disc"><SunActive/></div></div>
      <div className="sun-layer sun-light" aria-hidden="true"><div className="sun-wash"/></div>
    </>
  );
}



// Tuile décorative de la grille projets — orbe planète, anneaux, satellite en orbite
function PlanetCard() {
  return (
    <div className="planet-cell" aria-hidden="true">
      <PlanetGL ring palette="violet" tilt={0.38} view={0.22} scale={0.4} period={90} parallax={6} scrollParallax={0}/>
    </div>
  );
}


function ProjectCoverSVG({ type = "cabin", featured = false }) {
  const d = COVER_DEFS[type] || COVER_DEFS.cabin;
  const W = 800, H = featured ? 340 : 480;
  // useId : stable entre SSR et hydratation (Math.random() créait un mismatch)
  const uid = `cv_${type}_${featured ? "f" : "n"}_${useId().replace(/:/g, "")}`;
  const grid = Array.from({ length: 11 }, (_, i) => [
    <line key={`h${i}`} x1="0" y1={H*i/10} x2={W} y2={H*i/10} stroke="white" strokeOpacity=".022" strokeWidth="1"/>,
    <line key={`v${i}`} x1={W*i/10} y1="0" x2={W*i/10} y2={H} stroke="white" strokeOpacity=".022" strokeWidth="1"/>,
  ]);
  const M = {
    cabin:(<g opacity=".55"><rect x="255" y="38" width="290" height="385" rx="20" fill="none" stroke="#4B7FFA" strokeWidth="1.5" strokeOpacity=".35"/><rect x="263" y="56" width="274" height="350" rx="6" fill="#09113A" fillOpacity=".7"/><rect x="263" y="56" width="274" height="26" fill="#1535A8" fillOpacity=".8"/><circle cx="280" cy="69" r="5" fill="white" fillOpacity=".2"/>{[106,134,162,188,216,242,268,296,324,352].map((y,i)=><rect key={i} x="277" y={y} width={220*(0.3+((i*41)%100)/135)} height="8" rx="4" fill="#4B7FFA" fillOpacity=".14"/>)}<rect x="277" y="106" width="80" height="8" rx="4" fill={TOKENS.acc} fillOpacity=".4"/><circle cx="400" cy="200" r="50" fill="none" stroke="#4B7FFA" strokeWidth="1" strokeOpacity=".18"/><rect x="367" y="394" width="66" height="4" rx="2" fill="white" fillOpacity=".12"/></g>),
    skylib:(<g opacity=".55"><rect x="95" y="58" width="610" height="320" rx="12" fill="none" stroke="#0A9070" strokeWidth="1.5" strokeOpacity=".4"/><rect x="95" y="58" width="610" height="36" rx="12" fill="#042E1C" fillOpacity=".85"/>{[116,128,140].map((x,i)=><circle key={i} cx={x} cy={76} r={5} fill="white" fillOpacity=".1"/>)}<rect x="196" y="66" width="310" height="20" rx="10" fill="white" fillOpacity=".05"/>{[0,1,2,3,4,5,6].map(c=>[0,1,2,3,4].map(r=><rect key={`${c}-${r}`} x={110+c*84} y={108+r*50} width="76" height="40" rx="6" fill={c===3&&r===2?"#0A9070":"white"} fillOpacity={c===3&&r===2?.22:.04}/>))}<rect x="140" y="106" width="520" height="34" rx="9" fill="#0A9070" fillOpacity=".1" stroke="#0A9070" strokeOpacity=".2" strokeWidth="1"/></g>),
    ds:(<g opacity=".5"><rect x="290" y="28" width="220" height="420" rx="28" fill="none" stroke="#2E5BE8" strokeWidth="1.5" strokeOpacity=".5"/><rect x="296" y="48" width="208" height="388" rx="18" fill="#050820" fillOpacity=".85"/><circle cx="400" cy="180" r="85" fill="none" stroke="#2E5BE8" strokeWidth="1" strokeOpacity=".12"/><circle cx="400" cy="180" r="60" fill="none" stroke="#2E5BE8" strokeWidth="1.5" strokeOpacity=".28"/><path d="M320 280 Q400 150 480 280" fill="none" stroke="#2E5BE8" strokeWidth="1.5" strokeOpacity=".4"/><text x="400" y="186" textAnchor="middle" fill="#2E5BE8" fontSize="30" fontWeight="900" fontFamily="Syne" fillOpacity=".5">87%</text><text x="400" y="207" textAnchor="middle" fill="white" fontSize="11" fontFamily="DM Sans" fillOpacity=".2">Autonomie restante</text>{[0,1,2,3,4].map(i=><rect key={i} x={308+i*41} y={412} width="32" height="18" rx="6" fill={i===2?"#7C3AED":"white"} fillOpacity={i===2?.3:.05}/>)}</g>),
    sncf:(<g opacity=".55"><rect x="278" y="38" width="244" height="424" rx="26" fill="none" stroke="#C45C00" strokeWidth="1.5" strokeOpacity=".5"/><rect x="284" y="54" width="232" height="396" rx="16" fill="#180A00" fillOpacity=".75"/>{[278,320,370,428,478,510].map((x,i)=><g key={i}><circle cx={x} cy="200" r={i===0||i===5?8:5} fill={i===0?"#7C3AED":i===5?"#C45C00":"#3D1800"} fillOpacity=".9"/><circle cx={x} cy="200" r={i===0||i===5?4:2} fill="white" fillOpacity=".8"/></g>)}<line x1="278" y1="200" x2="510" y2="200" stroke="#C45C00" strokeWidth="1.5" strokeOpacity=".35" strokeDasharray="8 4"/><rect x="284" y="54" width="232" height="32" fill="#C45C00" fillOpacity=".12"/><rect x="292" y="384" width="224" height="58" rx="12" fill="#3D1800" fillOpacity=".5" stroke="#C45C00" strokeOpacity=".2" strokeWidth="1"/></g>),
    kara:(<g opacity=".55"><rect x="136" y="48" width="528" height="384" rx="16" fill="none" stroke="#7040CC" strokeWidth="1.5" strokeOpacity=".4"/><rect x="136" y="48" width="528" height="50" rx="16" fill="#14053A" fillOpacity=".85"/><circle cx="172" cy="73" r="16" fill="#26135A" stroke="#7040CC" strokeWidth="1" strokeOpacity=".5"/><text x="172" y="79" textAnchor="middle" fill={TOKENS.acc} fontSize="14" fontFamily="Syne" fontWeight="800">K</text><rect x="197" y="64" width="80" height="9" rx="4" fill="white" fillOpacity=".14"/><rect x="155" y="120" width="280" height="42" rx="12" fill="#26135A" fillOpacity=".85"/><rect x="155" y="172" width="220" height="34" rx="12" fill="#26135A" fillOpacity=".65"/><rect x="355" y="222" width="265" height="42" rx="12" fill="#18063A" fillOpacity=".85" stroke="#7040CC" strokeWidth=".5" strokeOpacity=".4"/><rect x="355" y="274" width="200" height="34" rx="12" fill="#18063A" fillOpacity=".65" stroke="#7040CC" strokeWidth=".5" strokeOpacity=".3"/>{[[163,134,185],[163,184,140],[363,236,165],[363,286,125]].map(([x,y,w],i)=><rect key={i} x={x} y={y} width={w*(.5+i*.08)} height="7" rx="3" fill="white" fillOpacity=".1"/>)}<rect x="144" y="400" width="512" height="28" rx="14" fill="#26135A" fillOpacity=".5" stroke="#7040CC" strokeOpacity=".2" strokeWidth="1"/><circle cx="640" cy="414" r="10" fill={TOKENS.acc} fillOpacity=".6"/></g>),
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{ width:"100%", height:"100%", display:"block" }}>
      <defs>
        <linearGradient id={`g_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={d.g1}/><stop offset="55%" stopColor={d.g2}/><stop offset="100%" stopColor={d.g3}/></linearGradient>
        <radialGradient id={`rg_${uid}`} cx="50%" cy="38%" r="58%"><stop offset="0%" stopColor={d.g3} stopOpacity=".14"/><stop offset="100%" stopColor="transparent"/></radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#g_${uid})`}/>
      <rect width={W} height={H} fill={`url(#rg_${uid})`}/>
      {grid}
      {M[type] || M.cabin}
    </svg>
  );
}

// ── COMPETENCE DIAGRAM ───────────────────────────────────────────────────────
/* Contact : une fiche éditoriale (mail en grand, puis un registre ligne à ligne)
   au lieu de cartes à pastille d'icône. */
function ContactSheet({ onTrack }) {
  const [copied, setCopied] = useState(false);
  const mail = "leloupthomas.pro@gmail.com";
  const copy = async () => {
    try { await navigator.clipboard.writeText(mail); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch {}
    if (onTrack) onTrack("contact_click", { label:"email_copy" });
  };
  return (
    <div className="csheet">
      <p className="csheet-avail"><span className="csheet-dot" aria-hidden="true"/>Disponible · CDI, freelance ou mission</p>
      <p className="csheet-lead">Un mail suffit. Je réponds sous 24 h, en général le jour même.</p>
      <div className="csheet-mail">
        <a href={"mailto:"+mail} onClick={()=>{ if(onTrack) onTrack("contact_click",{label:"email"}); }}>{mail}</a>
        <button type="button" className="csheet-copy" onClick={copy}>{copied ? "Copié" : "Copier"}</button>
        <span className="sr-only" aria-live="polite">{copied ? "Adresse copiée" : ""}</span>
      </div>
      <dl className="csheet-log">
        <div><dt>LinkedIn</dt><dd><a href="https://www.linkedin.com/in/thomas--leloup/" target="_blank" rel="noopener"
          onClick={()=>{ if(onTrack) onTrack("contact_click",{label:"linkedin"}); }}>thomas--leloup<span aria-hidden="true"> ↗</span><span className="sr-only"> (nouvel onglet)</span></a></dd></div>
        <div><dt>Base</dt><dd>Paris · remote possible</dd></div>
        <div><dt>Fuseau</dt><dd>UTC+1, Europe</dd></div>
      </dl>
    </div>
  );
}

function DoubleHatTree({ visible }) {
  const skills = [
    // txt = variante claire pour le % (la couleur de barre passait sous les 4.5:1 AA)
    { label:"UX Research",   pct:92, color:TOKENS.blue, txt:"#8FB0FF" },
    { label:"UI / Figma",    pct:95, color:TOKENS.acc, txt:"var(--brand-400)" },
    { label:"Design System", pct:88, color:"var(--success)" },
    { label:"Design Ops",    pct:80, color:"var(--brand-400)" },
    { label:"React / HTML",  pct:72, color:"var(--energy-500)" },
    { label:"Dev Collab",    pct:90, color:"var(--brand-300)" },
  ];

  const leaves = [
    { x:52, y:74, color:TOKENS.blue, t1:"UX",       t2:"Research",  r:52 },
    { x:170, y:74, color:TOKENS.blue, t1:"UI /",     t2:"Figma",     r:52 },
    { x:288, y:74, color:"var(--success)", t1:"Design",   t2:"Ops",       r:52 },
    { x:452, y:74, color:"var(--energy-500)", t1:"Logique",  t2:null,        r:52 },
    { x:570, y:74, color:"var(--brand-300)", t1:"Contrainte",t2:null,       r:52 },
    { x:688, y:74, color:"var(--brand-300)", t1:"Dev",      t2:"collab",    r:52 },
  ];

  const lines = [
    { x1:66, y1:126, x2:148, y2:162, color:TOKENS.blue, delay:0.05, len:89.6 },
    { x1:170, y1:126, x2:170, y2:162, color:TOKENS.blue, delay:0.1, len:36.0 },
    { x1:274, y1:126, x2:192, y2:162, color:"var(--success)", delay:0.15, len:89.6 },
    { x1:466, y1:126, x2:548, y2:162, color:"var(--energy-500)", delay:0.05, len:89.6 },
    { x1:570, y1:126, x2:570, y2:162, color:"var(--brand-300)", delay:0.1, len:36.0 },
    { x1:674, y1:126, x2:592, y2:162, color:"var(--brand-300)", delay:0.15, len:89.6 },
    { x1:244, y1:258, x2:294, y2:418, color:TOKENS.blue, delay:0.3, len:167.6 },
    { x1:496, y1:258, x2:446, y2:418, color:"var(--brand-400)", delay:0.3, len:167.6 },
    { x1:370, y1:530, x2:370, y2:562, color:TOKENS.blue, delay:0.46, len:32.0 },
  ];

  const ns = (delay) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "scale(1)" : "scale(0.5)",
    transformBox: "fill-box",
    transformOrigin: "center",
    transition: visible
      ? "opacity 0.45s "+delay+"s ease, transform 0.5s "+delay+"s cubic-bezier(0.34,1.4,0.64,1)"
      : "none",
  });

  const ls = (len, delay) => ({
    strokeDasharray: len,
    strokeDashoffset: visible ? 0 : len,
    transition: visible ? "stroke-dashoffset 0.6s "+delay+"s cubic-bezier(0.4,0,0.2,1)" : "none",
  });

  return (
    <div>
      <div className="diag-wrap rv">
        <svg viewBox="0 0 740 672" width="100%" style={{ display:"block", overflow:"visible" }}>
          <defs>
            <linearGradient id="boxGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6"/>
              <stop offset="100%" stopColor="#4B7FFA"/>
            </linearGradient>
          </defs>

          {/* Lines */}
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={l.color} strokeWidth="2" strokeOpacity=".7"
              style={ls(l.len, l.delay)}/>
          ))}

          {/* Leaf nodes */}
          {leaves.map((n, i) => (
            <g key={i} style={ns(0.12 + i * 0.07)}>
              <circle cx={n.x} cy={n.y} r={n.r}
                fill={n.color} fillOpacity=".1" stroke={n.color} strokeWidth="2"/>
              {n.t2 ? (
                <>
                  <text x={n.x} y={n.y - 8} textAnchor="middle"
                    fill={n.color} fontSize="15" fontFamily="Syne" fontWeight="700">{n.t1}</text>
                  <text x={n.x} y={n.y + 12} textAnchor="middle"
                    fill={n.color} fontSize="15" fontFamily="Syne" fontWeight="700">{n.t2}</text>
                </>
              ) : (
                <text x={n.x} y={n.y + 6} textAnchor="middle"
                  fill={n.color} fontSize="15" fontFamily="Syne" fontWeight="700">{n.t1}</text>
              )}
            </g>
          ))}

          {/* Left branch — Design */}
          <g style={ns(0.32)}>
            <circle cx={170} cy={236} r={74}
              fill="#8B5CF61A" stroke="#8B5CF6" strokeWidth="2.2"/>
            <text x={170} y={224} textAnchor="middle"
              fill="#8B5CF6" fontSize="26" fontFamily="Syne" fontWeight="800">Design</text>
            <text x={170} y={254} textAnchor="middle"
              fill="#8B5CF6" fontSize="15" fontFamily="DM Sans" fontWeight="500" opacity=".8">UX / UI</text>
          </g>

          {/* Right branch — Dev */}
          <g style={ns(0.32)}>
            <circle cx={570} cy={236} r={74}
              fill="#4B7FFA1A" stroke="#4B7FFA" strokeWidth="2.2"/>
            <text x={570} y={224} textAnchor="middle"
              fill="#4B7FFA" fontSize="26" fontFamily="Syne" fontWeight="800">Dev</text>
            <text x={570} y={254} textAnchor="middle"
              fill="#4B7FFA" fontSize="15" fontFamily="DM Sans" fontWeight="500" opacity=".8">Full Stack</text>
          </g>

          {/* Center — Product Designer */}
          <g style={ns(0.50)}>
            <circle cx={370} cy={442} r={88}
              fill="rgba(34,40,52,.95)" stroke="#8B5CF6" strokeWidth="2.5"/>
            <circle cx={370} cy={442} r={72}
              fill="none" stroke="#4B7FFA" strokeWidth="1.6" strokeDasharray="7 4"/>
            <text x={370} y={430} textAnchor="middle"
              fill="#F0EDFF" fontSize="28" fontFamily="Syne" fontWeight="800">Product</text>
            <text x={370} y={462} textAnchor="middle"
              fill="#8B5CF6" fontSize="17" fontFamily="DM Sans" fontWeight="500">Designer</text>
          </g>

          {/* Bottom box */}
          <g style={ns(0.64)}>
            <rect x={180} y={562} width={380} height={92} rx="18"
              fill="rgba(41,36,52,.95)" stroke="url(#boxGrad2)" strokeWidth="2.2"/>
            <text x={370} y={596} textAnchor="middle"
              fill="#F0EDFF" fontSize="26" fontFamily="Syne" fontWeight="800">Double expertise</text>
            <text x={370} y={624} textAnchor="middle"
              fill="#8B5CF6" fontSize="16" fontFamily="DM Sans" fontWeight="500">Designer x Engineering</text>
          </g>
        </svg>
      </div>

      {/* Skill bars */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px 32px", marginTop:28 }}>
        {skills.map((s) => (
          <div key={s.label} style={{ display:"flex", flexDirection:"column", gap:7 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13.5, fontWeight:600, color:"var(--tx2)" }}>
              <span>{s.label}</span>
              <span style={{ color:s.txt || s.color, fontFamily:"var(--fd)", fontWeight:700 }}>{s.pct}%</span>
            </div>
            <div style={{ height:7, background:"var(--bdr)", borderRadius:4, overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:4, background:s.color,
                width: visible ? s.pct + "%" : "0%",
                transition: visible ? "width 1.2s 0.6s cubic-bezier(0.4,0,0.2,1)" : "none",
              }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── NAV ───────────────────────────────────────────────────────────────────────
function Nav({ scrolled, onBack, onTrack, onNavigate, hidden, cvUrl }) {
  const [mobOpen, setMobOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const openMenu = () => { setClosing(false); setMobOpen(true); };
  const closeTimerRef = useRef(null);
  const closeMenu = useCallback(() => {
    setClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setMobOpen(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, 240);
  }, []);

  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

  const go = (id) => {
    closeMenu();
    if (onNavigate) { onNavigate(id); return; }
    const scrollTimer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });
    }, 260);
    if (onTrack) onTrack("nav_click", { section:id });
  };

  const links = [["presentation","Présentation"],["parcours","Parcours"],["projets","Projets"],["testimonials","Témoignages"],["contact","Contact"]];

  // Scrollspy : l'item reste actif tant qu'on est dans sa section (couleur + barre dessous)
  const [active, setActive] = useState(null);
  useEffect(() => {
    const ids = links.map(([id]) => id);
    const onScroll = () => {
      let cur = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= window.innerHeight * 0.45) cur = id;
      }
      // tout en bas de page, la dernière section est forcément l'active
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) cur = ids[ids.length - 1];
      setActive(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <nav className={`nav${scrolled ? " sc" : ""}`} style={{ zIndex: mobOpen ? 50 : 100, transform: hidden ? "translateY(-100%)" : "translateY(0)", transition:"transform .35s ease", pointerEvents: hidden ? "none" : "auto" }}>
        <div className="nlogo" onClick={onBack || (() => go("hero"))}>
          <div className="nlogo-mark" dangerouslySetInnerHTML={{ __html: LOGO_SVG }}/>
          <span className="nlogo-txt">Thomas Leloup</span>
        </div>
        <ul className="nlinks">
          {links.map(([id,lbl]) => <li key={id}><button className={active === id ? "on" : ""} onClick={() => go(id)}>{lbl}</button></li>)}
        </ul>
        <a className="ncv btn-rf" href={cvUrl ? "/api/cv" : "#"} target="_blank" rel="noopener" onClick={() => { if (onTrack) onTrack("cta_click", { label:"nav_cv" }); }}>Mon CV ↗</a>
        <a className="ncv-mobile" href={cvUrl ? "/api/cv" : "#"} target="_blank" rel="noopener" onClick={() => { if (onTrack) onTrack("cta_click", { label:"mobile_cv" }); }}>CV ↗</a>
        {!mobOpen && (
          <button className="nhb" onClick={openMenu} aria-label="Ouvrir le menu"><i className="bx bx-menu"/></button>
        )}
      </nav>

      {mobOpen && (
        <div className={`nmob${closing ? " closing" : " open"}`}>
          <button className="nmob-close" onClick={closeMenu} aria-label="Fermer le menu"><i className="bx bx-x"/></button>
          <div className="nlogo" style={{ marginBottom:8, animation:"linkFadeUp .35s .05s var(--ease) both" }}>
            <div dangerouslySetInnerHTML={{ __html: LOGO_SVG }}/>
            <span className="nlogo-txt">Thomas Leloup</span>
          </div>
          <div className="nmob-divider" style={{ animation:"linkFadeUp .35s .1s var(--ease) both" }}/>
          {links.map(([id,lbl], i) => (
            <button key={id} className={`nmob-nav-link${active === id ? " on" : ""}`} onClick={() => go(id)}
              style={{ animationDelay: `${0.12 + i * 0.07}s` }}>
              {lbl}
            </button>
          ))}
          <div className="nmob-divider" style={{ animation:`linkFadeUp .35s ${0.12+links.length*.07}s var(--ease) both` }}/>
          <a className="btn-pri"
            style={{ marginTop:4, textDecoration:"none", animation:`linkFadeUp .35s ${0.18+links.length*.07}s var(--ease) both` }}
            href={cvUrl ? "/api/cv" : "#"} target="_blank" rel="noopener"
            onClick={closeMenu}>
            Télécharger CV ↗
          </a>
        </div>
      )}
    </>
  );
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────
function HomePage({ projects, tags, testimonials, onProject, onTrack, cvUrl }) {
  useReveal();
  useExploreTracker();
  const [scrolled, setScrolled] = useState(false);
  const [filter, setFilter] = useState("Tous");
  const [tagFilter, setTagFilter] = useState(null);
  const [goAdmin, setGoAdmin] = useState(false);
  const [dhVisible, setDhVisible] = useState(false);
  const [px, setPx] = useState({ x:0, y:0 });
  const [mobCtaMode, setMobCtaMode] = useState("projects"); // "projects" | "contact"
  const [mobCtaVisible, setMobCtaVisible] = useState(false);
  const [showAllTsti, setShowAllTsti] = useState(false); // mobile : avis repliés derrière un fondu + bouton Voir plus
  const [coverRatios, setCoverRatios] = useState({}); // project id -> natural width/height of uploaded cover image
  const heroRef = useRef(null);
  const dhRef = useRef(null);
  useReveal();

  const handleHeroMouse = useCallback((e) => {
    if (!heroRef.current) return;
    const r = heroRef.current.getBoundingClientRect();
    setPx({ x:((e.clientX-r.left)/r.width-.5)*2, y:((e.clientY-r.top)/r.height-.5)*2 });
  }, []);
  const handleHeroLeave = useCallback(() => setPx({ x:0, y:0 }), []);

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 50);
      const heroEl = document.getElementById("hero");
      const projEl = document.getElementById("projets");
      const heroPast = heroEl ? heroEl.getBoundingClientRect().bottom < 0 : window.scrollY > 500;
      setMobCtaVisible(heroPast);
      if (projEl) {
        const projBottom = projEl.getBoundingClientRect().bottom;
        setMobCtaMode(projBottom < 0 ? "contact" : "projects");
      }
    };
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (!dhRef.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setDhVisible(true); }, { threshold: 0.1 });
    obs.observe(dhRef.current);
    return () => obs.disconnect();
  }, []);

  // GDPR: only track after explicit consent (cookieState resolved)
  useEffect(() => {
    if (onTrack) onTrack("visit", {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* onTrack intentionally omitted — stable callback ref */]);

  // le back-office s'ouvre DANS HomePage : on coupe le soleil (sinon il passe sur l'admin)
  useEffect(() => {
    document.body.classList.toggle("adm-open", goAdmin);
    return () => document.body.classList.remove("adm-open");
  }, [goAdmin]);
  if (goAdmin) return <Suspense fallback={null}><AdminPage onBack={() => setGoAdmin(false)}/></Suspense>;

  const categories = ["Tous", ...new Set(projects.map((p) => p.category))];
  const filtered = projects
    .filter((p) => filter === "Tous" || p.category === filter)
    .filter((p) => !tagFilter || p.tags.includes(tagFilter))
    .sort((a, b) => (a.order || 99) - (b.order || 99));
  const getTag = (id) => tags.find((t) => t.id === id);

  // Gallery layout: alternate row patterns
  const buildGallery = (items) => {
    const rows = [];
    let i = 0;
    const patterns = [
      { cls:"r1", sizes:["pcard-h-md","pcard-h-md"], count:2 },
      { cls:"r3", sizes:["pcard-h-sm","pcard-h-sm","pcard-h-sm"], count:3 },
      { cls:"r2", sizes:["pcard-h-md","pcard-h-md"], count:2 },
      { cls:"rfull", sizes:["pcard-h-md"], count:1 },
    ];
    let pi = 0;
    while (i < items.length) {
      const pat = patterns[pi % patterns.length];
      const slice = items.slice(i, i + pat.count);
      if (slice.length === 0) break;
      rows.push({ ...pat, items: slice });
      i += slice.length;
      pi++;
    }
    return rows;
  };
  // Planète décorative au centre de la grille (milieu de la rangée de 3), vue non filtrée uniquement
  const showPlanet = filter === "Tous" && !tagFilter && filtered.length > 3;
  const galleryItems = showPlanet
    ? [...filtered.slice(0, 3), { id: "__planet__", isPlanet: true }, ...filtered.slice(3)]
    : filtered;
  const galleryRows = buildGallery(galleryItems);

  // Card width follows the uploaded cover image's aspect ratio (height is fixed per row);
  // falls back to the curated fr proportions until the image loads or when there's no upload.
  const MIN_CARD_PX = 240;
  const DEFAULT_FR = { r1:[2,1], r2:[1,2], r3:[1,1,1], rfull:[1] };
  const rowGridColumns = (row) => row.items
    .map((p, pi) => coverRatios[p.id] || DEFAULT_FR[row.cls]?.[pi] || 1)
    .map((fr) => `minmax(${MIN_CARD_PX}px, ${fr}fr)`)
    .join(" ");
  const handleCoverLoad = (id) => (e) => {
    const ratio = e.target.naturalWidth / e.target.naturalHeight;
    if (!ratio || !isFinite(ratio)) return;
    setCoverRatios((prev) => (prev[id] === ratio ? prev : { ...prev, [id]: ratio }));
  };

  const sortedTesti = [...testimonials].sort((a,b) => (a.order||99)-(b.order||99));
  const featuredTesti = sortedTesti[0];
  const restTesti = sortedTesti.slice(1);

  return (
    <div>
      <a className="skip-link" href="#main">Aller au contenu</a>
      <BgCanvas/>
      <Nav scrolled={scrolled} onTrack={onTrack} cvUrl={cvUrl}/>

      <main id="main">
      {/* ── HERO ── */}
      <div className="hero-outer" ref={heroRef} onMouseMove={handleHeroMouse} onMouseLeave={handleHeroLeave}>
        {/* Background atmosphere */}
        <div className="hero-spotlight" style={{ transform:`translate(calc(-50% + ${px.x*25}px), calc(-50% + ${px.y*15}px))` }}/>
        <div className="hero-blob" style={{ transform:`translate(${px.x*-20}px, ${px.y*-12}px)` }}/>

        <section className="hero hero-c" id="hero">
          {/* Planète géante qui se fond dans le noir — arrière-plan du hero */}
          <PlanetGL className="hero-planet3" scale={1.0} view={0.3} tilt={-0.1} period={110} parallax={12} scrollParallax={0.08} fallback="/3d/hero-planet/f_0001.webp" onReady={markHeroReady}/>
          <div className="hero-cwrap">
            {/* Sandwich 3D : « Thomas » derrière l'astronaute, « Leloup » devant.
                L'animation d'entrée est portée par cstage (pas le h1) pour ne pas
                créer de stacking context qui emprisonnerait les z-index des lignes. */}
            <div className="hero-cstage afu d1">
              <div className="hero-castro" aria-hidden="true">
                <div style={{ transform:`perspective(900px) translate3d(${px.x*18}px, ${px.y*12}px, 0) rotateY(${-px.x*4}deg) rotateX(${px.y*2.5}deg)`, transition:"transform .18s ease-out" }}>
                  <img src="/astro-fly.webp" alt="" fetchPriority="high" width="1280" height="832" style={{ width:"100%", height:"auto", display:"block" }}/>
                </div>
              </div>
              <h1 className="hero-h1c">
                <span className="hero-name-grad hero-line1" style={{ transform:`translate(${px.x*-7}px, ${px.y*-4}px)`, transition:"transform .18s ease-out" }}>Thomas</span>
                <span className="hero-name-grad hero-line2" style={{ transform:`translate(${px.x*-10}px, ${px.y*-6}px)`, transition:"transform .18s ease-out" }}>Leloup</span>
              </h1>
            </div>
            <span className="hero-h1-sub afu d2" style={{ marginTop:12 }}>Design &amp; Engineering</span>

            {/* Spécialisations */}
            <p className="hero-spec afu d2">
              <span>UX Research</span><span>Design System</span><span>Design Ops</span><span>Dev Handoff</span><span>Prototypage</span>
            </p>

            <div className="hero-scrim" aria-hidden="true"/>
            <p className="hero-desc afu d3">
              Je conçois des expériences avec la <strong>précision d'un ingénieur</strong> et l'intention d'un designer.
              Issu d'un background <strong>Full Stack</strong> — je parle le même langage que les équipes tech
              et je pense aux <em>contraintes techniques pendant que je design</em>.
            </p>
            <div className="hero-acts afu d4">
              <button className="btn-pri btn-rf" onClick={() => { document.getElementById("projets")?.scrollIntoView({ behavior:"smooth" }); if (onTrack) onTrack("cta_click", { label:"hero_projects" }); }}>
                Voir mes projets →
              </button>
              <a className="btn-sec btn-rf" href={cvUrl ? "/api/cv" : "#"} target="_blank" rel="noopener" onClick={() => { if (onTrack) onTrack("cta_click", { label:"hero_cv" }); }}>
                Mon CV
              </a>
            </div>
            <div className="hero-scroll-hint afu d5">Scroll pour explorer</div>
          </div>

        </section>
      </div>

      {/* ── QUI SUIS-JE ── */}
      <section className="sec" id="presentation">
        <div className="seye rv">Présentation</div>
        <h2 className="stit rv">Qui suis-je ?</h2>
        <div className="about-grid">
          <div className="about-img-wrap rv">
            <AboutScene/>
          </div>
          <div className="about-txt">
            <div className="about-manifesto rv">
              «&nbsp;Rien n'est laissé au hasard&nbsp;: chaque détail est pensé, chaque usage anticipé — et même l'imprévu est calculé.&nbsp;»
            </div>
            <p className="rv">Dès l'âge de 12 ans, la modélisation 3D a été ma première rencontre avec le design. Après un parcours de <span className="hl">développeur Full Stack</span>, j'ai choisi de mettre cette double expertise au service du Product Design.</p>
            <p className="rv">Je conçois en <span className="hl">anticipant les contraintes techniques</span> et les futurs cas d'usage — je parle le même langage que les équipes dev. Spécialisé en <span className="hl">Design Ops</span>, je structure les process design pour les rendre scalables, reproductibles et alignés avec l'engineering.</p>
            <div className="about-skill-groups rv">
              {[
                ["Recherche", "bx-search", ["Audit UX","UX Research","Tests utilisateurs","Design thinking"]],
                ["Design", "bxs-palette", ["Design System","Maquettage","Prototypage","UX Writing"]],
                ["Ops & Dev", "bx-code-alt", ["Design Ops","React / HTML","Dev Handoff"]],
              ].map(([lab, ic, items]) => (
                <div className="askill-row" key={lab}>
                  <span className="askill-lab"><i className={`bx ${ic}`}/>{lab}</span>
                  <span className="askill-list">{items.join(" · ")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* ── DESIGN × ENGINEERING ── */}
      <section className="sec" id="expertise" style={{ paddingTop:40 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:32, marginBottom:0 }}>
            <div style={{ flex:1 }}>
              <div className="seye rv">Double expertise</div>
              <h2 className="stit rv">Design × Engineering</h2>
            </div>
            <img src="/astro-research.webp" alt="" aria-hidden="true" loading="lazy" width="402" height="572" className="rv" style={{ width:180, height:"auto", flexShrink:0, filter:"drop-shadow(0 12px 32px rgba(75,127,250,.2))", animation:"floatY 9s ease-in-out infinite", animationDelay:"1.5s" }}/>
          </div>
          <p style={{ fontSize:15, color:"var(--tx2)", maxWidth:580, lineHeight:1.8, marginTop:14 }} className="rv">
            Ma trajectoire atypique — développeur Full Stack devenu Product Designer — me donne un avantage concret : je conçois en anticipant les contraintes techniques, ce qui réduit les frictions avec les équipes de développement.
          </p>
          <div className="dh-wrap" ref={dhRef}>
            <DoubleHatTree visible={dhVisible}/>
            <div className="dh-info">
              <div className="dh-card rv">
                <div className="dh-card-ico"><i className="bx bxs-palette" style={{ color:"var(--brand-400)" }}/></div>
                <div className="dh-card-title">Product Design &amp; Design Ops</div>
                <div className="dh-card-desc">UX Research, wireframing, prototypage haute fidélité, design systems, tests utilisateurs. Je structure les processus design pour qu'ils soient scalables et partagés.</div>
              </div>
              <div className="dh-card rv">
                <div className="dh-card-ico"><i className="bx bx-code-alt" style={{ color:"var(--brand-400)" }}/></div>
                <div className="dh-card-title">Expérience Dev Full Stack</div>
                <div className="dh-card-desc">Background React, HTML/CSS, JavaScript, APIs. Je ne code plus mais je lis, comprends et anticipe les contraintes techniques dès la conception — résultat : moins d'allers-retours, des livrables dev-ready.</div>
              </div>
              <div className="dh-card rv" style={{ background:"var(--accd)", borderColor:"rgba(124,58,237,.3)" }}>
                <div className="dh-card-ico"><i className="bx bx-link" style={{ color:"var(--brand-300)" }}/></div>
                <div className="dh-card-title">Le pont entre design et tech</div>
                <div className="dh-card-desc">Je suis le designer que les développeurs apprécient : specs précises, composants bien nommés, edge cases anticipés dès la conception — sans jamais perdre de vue l'expérience utilisateur finale.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PARCOURS ── */}
      <section className="sec" id="parcours" style={{ paddingTop:0 }}>
        <div className="seye rv">Parcours</div>
        <h2 className="stit rv">Mon parcours</h2>
        <div className="tl-grid">
          {[
            { year:"2016 — 2019", title:"Bac STI2D", school:"Lycée Jean Monnet · Développeur Arduino et électronique", ico:"bx-ruler" },
            { year:"2019 — 2021", title:"BTS SIO", school:"Lycée St-Vincent Senlis · Développeur Full Stack React/Node.js", ico:"bx-code-alt" },
            { year:"2021 — 2022", title:"Bachelor Designer UX/UI", school:"Digital Campus Paris", ico:"bxs-graduation" },
            { year:"2022 — 2024", title:"Mastère Lead Designer UX/UI", school:"Digital Campus Paris — Spécialisation Design Ops", ico:"bxs-rocket" },
          ].map((item) => (
            <div className="tl-card rv" key={item.year}>
              <div className="tl-ico"><i className={`bx ${item.ico}`} style={{ color:"var(--brand-400)" }}/></div>
              <div className="tl-year">{item.year}</div>
              <div className="tl-title">{item.title}</div>
              <div className="tl-school">{item.school}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRANSITION TROU NOIR — aspiration au scroll, ouvre le chapitre Projets ── */}
      <BlackHole/>

      {/* ── PROJETS ── */}
      <section className="sec" id="projets" style={{ paddingTop:0 }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:24 }}>
          <div>
            <div className="seye rv">Portfolio</div>
            <h2 className="stit rv">Projets</h2>
          </div>
          <img src="/astro-tablet.webp" alt="" aria-hidden="true" loading="lazy" width="377" height="606" className="rv" style={{ width:170, height:"auto", opacity:.92, flexShrink:0, marginBottom:-8, filter:"drop-shadow(0 12px 32px rgba(124,58,237,.25))", animation:"floatY 8s ease-in-out infinite" }}/>
        </div>
        <div className="pf-bar rv">
          {categories.map((c) => <button key={c} className={`pf-btn${filter===c?" on":""}`} onClick={() => { setFilter(c); setTagFilter(null); }}>{c}</button>)}
          <div className="pf-sep"/>
          {tags.slice(0,6).map((t) => <button key={t.id} className={`pf-btn${tagFilter===t.id?" on":""}`} onClick={() => { setTagFilter(tagFilter===t.id?null:t.id); setFilter("Tous"); }}>{t.name}</button>)}
        </div>
        {filtered.length === 0 ? (
          <div className="pno">Aucun projet pour ce filtre.</div>
        ) : (
          <div className="pgallery">
            {galleryRows.map((row, ri) => (
              <div key={ri} className={`pgallery-row ${row.cls}`} style={{ "--row-cols": rowGridColumns(row) }}>
                {row.items.map((p, pi) => p.isPlanet ? (
                  <PlanetCard key={p.id}/>
                ) : (
                  <div key={p.id} className={`pcard ${row.sizes[pi] || "pcard-h-md"}`}
                    onClick={() => { onProject(p.id); if (onTrack) onTrack("project_click", { project:p.id }); }}>
                    <div className="pcard-img" style={{ height:"100%" }}>
                      {p.coverImage ? (
                        <img src={p.coverImage} alt={p.title} onLoad={handleCoverLoad(p.id)}
                          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                      ) : (
                        <ProjectCoverSVG type={p.coverType||"cabin"} featured={row.cls==="rfull"}/>
                      )}
                    </div>
                    <div className="pcard-ov"/>
                    {p.confidential && <div className="pcard-lock"><i className="bx bx-lock-alt" style={{ verticalAlign:"-2px" }}/> Confidentiel</div>}
                    <div className="pcard-arr">→</div>
                    <div className="pcard-body">
                      <div className="pcard-cat">{p.category}</div>
                      <div className="pcard-title">{p.title}</div>
                      <div className="pcard-sub">{p.subtitle}</div>
                      {(p.metrics?.[0] || p.role) && (
                        <div className="pcard-impact">
                          {p.metrics?.[0] && <span className="pcard-imp"><i className="bx bx-trending-up"/><b>{p.metrics[0].value}</b>{String(p.metrics[0].label || "").split(/[,—]/)[0].trim()}</span>}
                          {p.role && <span className="pcard-role">{p.role}</span>}
                        </div>
                      )}
                      <div className="pcard-tags">
                        {p.tags.slice(0,4).map((tid) => { const t=getTag(tid); return t?<span className="ptag" key={tid}>{t.name}</span>:null; })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section className="sec" id="testimonials" style={{ paddingTop:0 }}>
        <div className="seye rv">Recommandations</div>
        <h2 className="stit rv">Ce qu'on dit de moi</h2>
        <div className={`testi-wrap${showAllTsti ? "" : " testi-collapsed"}`}>
          {[...testimonials].sort((a,b)=>(a.order||99)-(b.order||99)).map((t, i) => (
            <div className={`tcard rv`} key={t.id}>
              <div className="tcard-header">
                <div className="tcard-author">
                  <div className="tcard-avt">{t.init}</div>
                  <div>
                    <div className="tcard-name">{t.name}</div>
                    <div className="tcard-role">{t.role}{t.role && t.company ? " · " : ""}{t.company}</div>
                  </div>
                </div>
                <div className="tcard-company">
                  {t.companyLogo
                    ? t.companyLogo.split(",").filter(Boolean).map((u, li) => <img key={li} src={u} className="tcard-co-img" alt={t.company}/>)
                    : t.company
                      ? <span className="tcard-co-badge">{t.company}</span>
                      : null
                  }
                </div>
              </div>
              <p className={`tcard-quote${i === 0 ? " featured-quote" : ""}`}>{t.text}</p>
              <div className="tcard-star">{"★".repeat(t.rating??5)}{"☆".repeat(5-(t.rating??5))}</div>
            </div>
          ))}
          {testimonials.length === 0 && <div className="aempty">Aucun témoignage pour le moment.</div>}
        </div>
        {!showAllTsti && testimonials.length > 2 && (
          <button className="testi-more" onClick={() => setShowAllTsti(true)}>Voir plus d'avis ↓</button>
        )}
      </section>

      {/* ── PAS DE TIR — fin de la mission ── */}
      <LaunchPad cvHref={cvUrl ? "/api/cv" : "#"}/>

      {/* ── CONTACT ── */}
      <section className="sec" id="contact" style={{ paddingTop:0 }}>
        <div className="seye rv">Contact</div>
        <h2 className="stit rv">Travaillons ensemble.</h2>
        <div className="contact-layout rv">
          {/* Left — info : une fiche, pas des cartes */}
          <ContactSheet onTrack={onTrack}/>
          {/* Right — form */}
          <ContactForm onTrack={onTrack}/>
        </div>
      </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="foot">
        <div className="foot-copy">© {new Date().getFullYear()} Thomas Leloup</div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ color:"var(--tx3)", fontSize:11 }}>Product Designer · Design Ops · Paris</span>
          <a href="/mentions-legales" style={{ color:"var(--tx3)", fontSize:11, textDecoration:"underline", textUnderlineOffset:3 }}>Mentions légales</a>
        </div>
        <button className="foot-admin-btn" onClick={() => setGoAdmin(true)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Admin
        </button>
      </footer>

      {/* ── MOBILE CTA FLOTTANT ── */}
      <button
        className={`mob-cta ${mobCtaMode==="contact"?"mob-cta-contact":"mob-cta-proj"}`}
        style={{ opacity: mobCtaVisible ? 1 : 0, transform: `translateX(-50%) translateY(${mobCtaVisible ? 0 : 16}px)`, pointerEvents: mobCtaVisible ? "auto" : "none" }}
        onClick={() => {
          const id = mobCtaMode==="contact" ? "contact" : "projets";
          document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });
          if (onTrack) onTrack("cta_click", { label: mobCtaMode==="contact" ? "mobile_contact" : "mobile_projects" });
        }}>
        {mobCtaMode==="contact"
          ? <><i className="bx bx-envelope" style={{ verticalAlign:"-2px", marginRight:7 }}/>Contactez-moi</>
          : <><i className="bx bx-right-arrow-alt" style={{ verticalAlign:"-2px", marginRight:7 }}/>Voir mes projets</>}
      </button>
    </div>
  );
}

// ── PROJECT DETAIL ────────────────────────────────────────────────────────────
function ProjectPage({ project: p, allProjects, tags, testimonials = [], onBack, onProject, onTrack, cvUrl }) {
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [lb, setLb] = useState(null);
  const lastScrollY = useRef(0);
  useReveal();
  useProjectTracker(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    setPastHero(false); setNavHidden(false); lastScrollY.current = 0;
    const fn = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      setPastHero(y > 380);
      if (y < 80) { setNavHidden(false); }
      else if (y > lastScrollY.current + 4) { setNavHidden(true); }
      else if (y < lastScrollY.current - 4) { setNavHidden(false); }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", fn, { passive: true });
    if (onTrack) onTrack("project_view", { project:p.id });
    return () => window.removeEventListener("scroll", fn);
  }, [p]);
  const getTag = (id) => tags.find((t) => t.id === id);
  const sorted = [...allProjects].sort((a, b) => (a.order||99)-(b.order||99));
  const idx = sorted.findIndex((x) => x.id === p.id);
  const prev = sorted[idx-1], next = sorted[idx+1];
  const pvIcons = ["✦","◈","⬡","◆","✶","◉","⬟","◇"];

  // Témoignages liés à ce projet (mapping project_ids en base)
  const projTesti = testimonials.filter((t) => (t.projects || []).includes(p.id));

  // Build sections for sub-nav (only those with data)
  const subSections = [
    p.context && { id:"context", label:"Contexte" },
    p.problematique && { id:"problematique", label:"Problématique" },
    p.objectifs?.length && { id:"objectifs", label:"Objectifs" },
    p.processSteps?.length && { id:"processus", label:"Processus" },
    p.metrics?.length && { id:"resultats", label:"Résultats" },
    p.images?.length && { id:"gallery", label:"Visuels" },
    p.plusValues?.length && { id:"plusvalues", label:"Plus-values" },
    p.tools?.length && { id:"outils", label:"Outils" },
    projTesti.length > 0 && { id:"avis", label:"Ils en parlent" },
  ].filter(Boolean);

  return (
    <div className="pd-page">
      <BgCanvas variant={p.coverType || "cabin"}/>
      <Nav scrolled={scrolled} onBack={()=>onBack()} onTrack={onTrack} onNavigate={(id)=>onBack(id)} hidden={navHidden} cvUrl={cvUrl}/>
      {subSections.length > 0 && (
        <div style={{
          position:"fixed", left:0, right:0, zIndex:49,
          top: pastHero ? (navHidden ? 0 : 68) : -80,
          transition:"top .32s ease",
          opacity: pastHero ? 1 : 0,
          pointerEvents: pastHero ? "auto" : "none",
        }}>
          <ProjectSubNav sections={subSections}/>
        </div>
      )}
      {lb && <Lightbox images={lb.images} startIndex={lb.idx} onClose={()=>setLb(null)}/>}
      <div className="page-proj-enter">
      <div className="pd-hero">
        <button className="pdbk afu" onClick={()=>onBack()}>← Retour aux projets</button>
        <div className="pd-hero-inner">
          <div>
            <div className="pd-cat afu">{p.category}</div>
            <h1 className="pd-h1 afu d1">{p.title}</h1>
            <p className="pd-subtitle afu d2">{p.subtitle}</p>
            <div className="pd-taglist afu d3">
              {p.tags?.map((tid) => { const t=getTag(tid); return t?<span key={tid} className="pd-tag" style={{ background:t.color+"1A", color:tagTxt(t.color), border:`1px solid ${t.color}30` }}>{t.name}</span>:null; })}
              {p.confidential && <span className="pd-tag pd-conf"><i className="bx bx-lock-alt" style={{ verticalAlign:"-2px" }}/> Confidentiel</span>}
            </div>
          </div>
          {/* watermark décoratif (l'année est lisible dans le brief) — exempt WCAG 1.4.3 */}
          <div className="pd-year-badge afu d2" aria-hidden="true">{p.year}</div>
        </div>
      </div>
      <div className="pd-brief rv">
        {[["Rôle",p.role||"Product Designer"],["Durée",p.duration||"—"],["Plateforme",p.platform||"—"],["Client",p.client||"—"],["Année",p.year||"—"]].map(([k,v]) => (
          <div className="pd-brief-item" key={k}><div className="pd-brief-lbl">{k}</div><div className="pd-brief-val">{v}</div></div>
        ))}
      </div>
      <div className="pd-cover rv">
        {p.coverImage ? (
          <img src={p.coverImage} alt={p.title} style={{ width:"100%", maxHeight:480, objectFit:"cover", borderRadius:16, display:"block" }}/>
        ) : (
          <ProjectCoverSVG type={p.coverType||"cabin"} featured={true}/>
        )}
      </div>

      {/* Images strip — right after cover. Au-delà de 5 : tuile "+N photos" → lightbox */}
      {p.images?.length > 0 && (
        <div id="pds-gallery" style={{ padding:"0 64px", marginBottom:24 }}>
          <div className="pd-img-strip">
            {p.images.slice(0, 5).map((src, i) => (
              <img key={i} src={src} alt={`${p.title} — ${i+1}`} className="pd-img-strip-item"
                onClick={()=>setLb({ images:p.images, idx:i })}/>
            ))}
            {p.images.length > 5 && (
              <button className="pd-img-more" style={{ backgroundImage:`url(${p.images[5]})` }}
                onClick={()=>setLb({ images:p.images, idx:5 })} aria-label={`Voir les ${p.images.length - 5} photos restantes`}>
                <span><i className="bx bx-images"/>+{p.images.length - 5} photos</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="pd-content">
        {p.context && (<>
          <div id="pds-context" className="pd-slbl rv">Contexte <span className="pd-slbl-num">01</span></div>
          <div className="pd-intro-grid rv">
            <p className="pd-intro-txt">{p.context}</p>
            <div className="pd-intro-sidebar">
              {[["Secteur",p.category],["Rôle",p.role||"—"],["Durée",p.duration||"—"],["Plateforme",p.platform||"—"],["Client",p.client||"—"]].map(([k,v]) => (
                <div className="pd-sidebar-item" key={k}><span className="pd-sidebar-k">{k}</span><span className="pd-sidebar-v">{v}</span></div>
              ))}
            </div>
          </div>
        </>)}
        {p.problematique && (<>
          <div id="pds-problematique" className="pd-slbl rv">Problématique <span className="pd-slbl-num">02</span></div>
          <div className="pd-problem rv"><p className="pd-problem-q">{p.problematique}</p></div>
        </>)}
        {p.objectifs?.length > 0 && (<>
          <div id="pds-objectifs" className="pd-slbl rv">Objectifs <span className="pd-slbl-num">03</span></div>
          <div className="pd-obj-grid rv">
            {p.objectifs.map((o,i) => (
              <div className="pd-obj-card" key={i}><div className="pd-obj-num">0{i+1}</div><div className="pd-obj-txt">{o}</div></div>
            ))}
          </div>
        </>)}
        {p.processSteps?.length > 0 && (<>
          <div id="pds-processus" className="pd-slbl rv">Processus <span className="pd-slbl-num">04</span></div>
          <div className="pd-process rv">
            {p.processSteps.map((s,i) => (
              <div className="pd-step" key={i}>
                <div className="pd-step-left">
                  <div className="pd-step-num">{s.num}</div>
                  {i < p.processSteps.length-1 && <div className="pd-step-line"/>}
                </div>
                <div className="pd-step-body">
                  <div className="pd-step-title">{s.title}</div>
                  <div className="pd-step-desc">{s.desc}</div>
                  {s.tools?.length > 0 && <div className="pd-step-tags">{s.tools.map((t) => <span className="pd-step-tag" key={t}>{t}</span>)}</div>}
                </div>
              </div>
            ))}
          </div>
        </>)}
        {p.metrics?.length > 0 && (<>
          <div id="pds-resultats" className="pd-slbl rv">Résultats <span className="pd-slbl-num">05</span></div>
          <div className="pd-metrics rv">
            {p.metrics.map((m,i) => (
              <div className="pd-metric" key={i}><div className="pd-metric-val">{m.value}</div><div className="pd-metric-lbl">{m.label}</div></div>
            ))}
          </div>
        </>)}
        {p.plusValues?.length > 0 && (<>
          <div id="pds-plusvalues" className="pd-slbl rv">Plus-values <span className="pd-slbl-num">0{p.images?.length?7:6}</span></div>
          <div className="pd-pv rv">
            {p.plusValues.map((v,i) => (
              <div className="pd-pv-item" key={i}><div className="pd-pv-icon">{pvIcons[i%pvIcons.length]}</div><div className="pd-pv-txt">{v}</div></div>
            ))}
          </div>
        </>)}
        {p.tools?.length > 0 && (<>
          <div id="pds-outils" className="pd-slbl rv">Outils</div>
          <div className="pd-tools-row rv">
            {p.tools.map((t) => (
              <div className="pd-tool" key={t}>
                <ToolLogo name={t}/>
                <span className="pd-tool-name">{t}</span>
              </div>
            ))}
          </div>
        </>)}
        {/* Témoignages des personnes ayant travaillé sur CE projet — social proof contextuelle */}
        {projTesti.length > 0 && (<>
          <div id="pds-avis" className="pd-slbl rv">Ils en parlent</div>
          <div className="pd-testi rv">
            {projTesti.map((t) => (
              <div className="pd-testi-card" key={t.id}>
                <p className="pd-testi-quote">«&nbsp;{t.text.length > 240 ? t.text.slice(0, 240).trim() + "…" : t.text}&nbsp;»</p>
                <div className="pd-testi-foot">
                  <div className="tcard-avt">{t.init}</div>
                  <div className="pd-testi-who">
                    <div className="pd-testi-name">{t.name}</div>
                    <div className="pd-testi-role">{t.role}</div>
                  </div>
                  <div className="pd-testi-logos">
                    {(t.companyLogo || "").split(",").filter(Boolean).map((u, li) => <img key={li} src={u} alt={t.company}/>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>)}
      </div>
      {/* Conversion : le recruteur vient de dérouler tout le process — c'est LE moment */}
      <div className="pd-cta rv">
        <div className="pd-cta-t">Ce process vous parle ?</div>
        <div className="pd-cta-s">Chaque projet suit la même exigence : anticiper les usages, mesurer l'impact, soigner le moindre détail. Parlons de ce que je peux apporter à votre équipe.</div>
        <div className="pd-cta-btns">
          <button className="btn-pri btn-rf" onClick={() => { if (onTrack) onTrack("cta_click", { label:"project_contact" }); onBack("contact"); }}>Discutons-en →</button>
          <a className="btn-sec btn-rf" href={cvUrl ? "/api/cv" : "#"} target="_blank" rel="noopener" onClick={() => { if (onTrack) onTrack("cta_click", { label:"project_cv" }); }}>Mon CV</a>
        </div>
      </div>
      <div className="pd-nav">
        <div>{prev && <><div className="pd-nav-lbl">← Précédent</div><div className="pd-nav-t" onClick={() => onProject(prev.id)}>{prev.title}</div></>}</div>
        <div style={{ textAlign:"right" }}>{next && <><div className="pd-nav-lbl">Suivant →</div><div className="pd-nav-t" onClick={() => onProject(next.id)}>{next.title}</div></>}</div>
      </div>
      </div>
    </div>
  );
}

// ── DASHBOARD ANALYTICS — server-side ────────────────────────────────────────


// ── CONTACT FORM ─────────────────────────────────────────────────────────────
function ContactForm({ onTrack }) {
  const MAX_MESSAGE = 1500; // limite alignée sur le schéma Zod côté API
  const [form, setForm] = useState({ name:"", email:"", subject:"CDI", message:"" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | success | error

  const set = (k, v) => { setForm((f) => ({ ...f, [k]:v })); setErrors((e) => ({ ...e, [k]:"" })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "🚀 Houston, on a besoin de votre nom pour décoller !";
    else if (form.name.trim().length < 2) e.name = "Un nom de 2 caractères minimum, s'il vous plaît.";
    if (!form.email.trim()) e.email = "📡 Sans adresse email, impossible de vous répondre !";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Cette adresse email ne ressemble pas à une orbite valide 🛸";
    if (!form.message.trim()) e.message = "✍️ Votre message est vide — que souhaitez-vous me dire ?";
    else if (form.message.trim().length < 20) e.message = `Encore ${20 - form.message.trim().length} caractères avant le décollage... ✨`;
    return e;
  };

  const send = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setStatus("sending");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name:form.name, email:form.email, subject:form.subject, message:form.message }),
      });
      if (!r.ok) { setStatus("error"); return; }
      if (onTrack) onTrack("contact_form_send", { subject:form.subject });
      setStatus("success");
      mission.complete("contact");
    } catch { setStatus("error"); }
  };

  if (status === "error") {
    return (
      <div className="cform-wrap">
        <div className="cform-success" style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)" }}>
          <div className="cform-success-ico"><i className="bx bx-planet" style={{ color:"var(--brand-400)" }}/></div>
          <div className="cform-success-title" style={{ color:"var(--danger)" }}>Problème de transmission !</div>
          <div className="cform-success-txt">
            Une anomalie a perturbé le signal. Pas de panique —<br/>
            écrivez-moi directement à{" "}
            <a href="mailto:leloupthomas.pro@gmail.com" style={{ color:"var(--acc)", fontWeight:600 }}>
              leloupthomas.pro@gmail.com
            </a>
          </div>
          <button className="btn-sec" style={{ margin:"16px auto 0", display:"block" }}
            onClick={() => setStatus("idle")}>
            ← Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="cform-wrap">
        <div className="cform-success">
          <div className="cform-success-ico"><i className="bx bxs-rocket" style={{ color:"var(--brand-400)" }}/></div>
          <div className="cform-success-title">Message envoyé avec succès !</div>
          <div className="cform-success-txt">
            Je vous répondrai sous 24h à<br/>
            <strong style={{ color:"var(--acc)" }}>leloupthomas.pro@gmail.com</strong><br/>
            <span style={{ fontSize:12, color:"var(--tx3)", marginTop:8, display:"block" }}>Je réponds sous 24h — promis, même depuis l'espace 🛸</span>
          </div>
          <button className="btn-sec" style={{ margin:"16px auto 0", display:"block" }}
            onClick={() => { setStatus("idle"); setForm({ name:"", email:"", subject:"CDI", message:"" }); }}>
            Envoyer un autre message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cform-wrap">
      <div className="cform-title">Envoyez-moi un message</div>
      <div className="cform-sub">Réponse sous 24h · Aucune donnée stockée côté serveur</div>
      <div className="cform">
        <div className="cform-row">
          <div className="cform-group">
            <label className="cform-label">Nom *</label>
            <input className="cform-input" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="Jean Dupont" onKeyDown={(e) => e.key === "Enter" && send()}/>
            {errors.name && <span className="cform-error">{errors.name}</span>}
          </div>
          <div className="cform-group">
            <label className="cform-label">Email *</label>
            <input className="cform-input" type="email" value={form.email}
              onChange={(e) => set("email", e.target.value)} placeholder="jean@entreprise.com"
              onKeyDown={(e) => e.key === "Enter" && send()}/>
            {errors.email && <span className="cform-error">{errors.email}</span>}
          </div>
        </div>
        <div className="cform-group">
          <label className="cform-label">Objet</label>
          <select className="cform-select" value={form.subject} onChange={(e) => set("subject", e.target.value)}>
            <option value="CDI">Opportunité CDI</option>
            <option value="Freelance">Mission freelance</option>
            <option value="Conseil">Mission de conseil</option>
            <option value="Collaboration">Collaboration / Partenariat</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div className="cform-group">
          <label className="cform-label">Message *</label>
          <textarea className="cform-input cform-textarea" value={form.message}
            onChange={(e) => set("message", e.target.value.slice(0, MAX_MESSAGE))}
            placeholder="Décrivez votre projet, poste ou opportunité..."/>
          {errors.message && <span className="cform-error">{errors.message}</span>}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            <span style={{ fontSize:11, color: form.message.length < 20 ? "var(--acc)" : "var(--success)" }}>
              {form.message.length < 20 ? `Minimum 20 caractères (${20-form.message.length} restants)` : "✓ Longueur OK"}
            </span>
            <span style={{ fontSize:11, color:"var(--tx3)" }}>{form.message.length} / {MAX_MESSAGE}</span>
          </div>
        </div>
        <button className="cform-submit btn-rf" onClick={send} disabled={status === "sending"}>
          {status === "sending" ? <><i className="bx bxs-rocket" style={{ verticalAlign:"-2px", marginRight:6 }}/>Envoi en cours…</> : "Envoyer le message →"}
        </button>
        <p style={{ fontSize:11, color:"var(--tx3)", textAlign:"center", lineHeight:1.6 }}>
          Votre message m'arrive directement par e-mail — je réponds sous 24h.<br/>
          Aucune donnée n'est conservée en base.
        </p>
      </div>
    </div>
  );
}


// ── ERROR PAGES — custom space-themed ────────────────────────────────────────
function NotFoundPage({ onHome }) {
  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh" }}>
      <BgCanvas/>
      <div className="err-page">
        <div className="err-code" aria-hidden="true">404</div>
        <div className="err-astronaut">
          <AstronautSVG size={200}/>
        </div>
        <div className="err-badge"><i className="bx bx-error" style={{ verticalAlign:"-2px", marginRight:5 }}/>Erreur 404</div>
        <h1 className="err-title">Vous vous êtes perdu dans l'espace !</h1>
        <p className="err-sub">
          Houston, on a un problème. La page que vous cherchez a dérivé dans une orbite inconnue.<br/>
          Pas de panique — <em>revenez sur Terre</em> et on repart ensemble.
        </p>
        <div className="err-actions">
          <button className="btn-pri" onClick={onHome}><i className="bx bx-planet" style={{ verticalAlign:"-2px", marginRight:6 }}/>Retour sur Terre</button>
          <a className="btn-sec" href="mailto:leloupthomas.pro@gmail.com"><i className="bx bx-broadcast" style={{ verticalAlign:"-2px", marginRight:6 }}/>Contacter la base</a>
        </div>
      </div>
    </div>
  );
}

function ErrorPage({ onHome, message }) {
  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh" }}>
      <BgCanvas/>
      <div className="err-page">
        <div className="err-code" aria-hidden="true">500</div>
        <div className="err-astronaut">
          <AstronautSVG size={200}/>
        </div>
        <div className="err-badge"><i className="bx bxs-zap" style={{ verticalAlign:"-2px", marginRight:5 }}/>Erreur système</div>
        <h1 className="err-title">Micro-météorite dans les serveurs !</h1>
        <p className="err-sub">
          Une anomalie cosmique a perturbé la navigation. L'équipe de mission est sur le coup.<br/>
          {message && <><em>{message}</em><br/></>}
          En attendant, <em>regagnez la capsule principale</em>.
        </p>
        <div className="err-actions">
          <button className="btn-pri" onClick={onHome}><i className="bx bxs-rocket" style={{ verticalAlign:"-2px", marginRight:6 }}/>Retour à la capsule</button>
          <button className="btn-sec" onClick={() => window.location.reload()}><i className="bx bx-refresh" style={{ verticalAlign:"-2px", marginRight:6 }}/>Relancer les moteurs</button>
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(error) { return { hasError:true, error }; }
  render() {
    if (this.state.hasError) {
      return <ErrorPage onHome={() => { this.setState({ hasError:false, error:null }); if(this.props.onHome) this.props.onHome(); }} message={this.state.error?.message}/>;
    }
    return this.props.children;
  }
}

// ── TOOL LOGOS ───────────────────────────────────────────────────────────────
const TOOL_ICONS = {
  "figma":{"slug":"figma","bg":"#1E1E1E"},
  "figjam":{"slug":"figma","bg":"#F24E1E"},
  "jira":{"slug":"jira","bg":"#0052CC"},
  "confluence":{"slug":"confluence","bg":"#0052CC"},
  "notion":{"slug":"notion","bg":"#000"},
  "slack":{"slug":"slack","bg":"#4A154B"},
  "miro":{"slug":"miro","bg":"#FFD02F","dark":true},
  "sketch":{"slug":"sketch","bg":"#F7B500","dark":true},
  "zeplin":{"slug":"zeplin","bg":"#FDBD39","dark":true},
  "invision":{"slug":"invision","bg":"#FF3366"},
  "maze":{"slug":"maze","bg":"#F44A64"},
  "hotjar":{"slug":"hotjar","bg":"#F94D3A"},
  "adobe xd":{"slug":"adobexd","bg":"#FF61F6"},
  "illustrator":{"slug":"adobeillustrator","bg":"#FF9A00"},
  "photoshop":{"slug":"adobephotoshop","bg":"#31A8FF"},
  "after effects":{"slug":"adobeaftereffects","bg":"#9999FF"},
  "premiere":{"slug":"adobepremierepro","bg":"#9999FF"},
  "trello":{"slug":"trello","bg":"#0052CC"},
  "asana":{"slug":"asana","bg":"#F06A6A"},
  "linear":{"slug":"linear","bg":"#5E6AD2"},
  "github":{"slug":"github","bg":"#181717"},
  "teams":{"slug":"microsoftteams","bg":"#6264A7"},
  "microsoft teams":{"slug":"microsoftteams","bg":"#6264A7"},
  "react":{"slug":"react","bg":"#222","icon":"#61DAFB"},
  "next.js":{"slug":"nextdotjs","bg":"#000"},
  "typescript":{"slug":"typescript","bg":"#3178C6"},
  "loom":{"slug":"loom","bg":"#625DF5"},
  "notion":{"slug":"notion","bg":"#fff","dark":true},
  "google analytics":{"slug":"googleanalytics","bg":"#E37400"},
  "framer":{"slug":"framer","bg":"#0055FF"},
  "principle":{"bx":"bxs-star","bg":"#7C3AED"},
  "entretiens":{"bx":"bxs-microphone","bg":"#4B7FFA"},
  "tests utilisateurs":{"bx":"bx-test-tube","bg":"#06D6A0"},
  "personas":{"bx":"bx-user","bg":"#F59E0B"},
  "user journey":{"bx":"bx-map-alt","bg":"#EC4899"},
  "prototype":{"bx":"bxs-zap","bg":"#7C3AED"},
  "prototype hf":{"bx":"bxs-zap","bg":"#7C3AED"},
  "workshop":{"bx":"bx-group","bg":"#F97316"},
  "benchmark":{"bx":"bx-bar-chart-alt-2","bg":"#38BDF8"},
  "co-conception":{"bx":"bx-pencil","bg":"#8B5CF6"},
  "pitch":{"bx":"bx-target-lock","bg":"#F59E0B"},
};

function ToolLogo({ name }) {
  const key = name.toLowerCase().trim();
  const cfg = TOOL_ICONS[key];
  if (!cfg) {
    const initials = name.split(/[\s/]+/).map(w=>w[0]).join("").toUpperCase().slice(0,2);
    return <div className="pd-tool-logo" style={{ background:"var(--accd)", color:"var(--acc)", fontSize:10 }}>{initials}</div>;
  }
  if (cfg.bx) return <div className="pd-tool-logo" style={{ background:"var(--space-3)", border:"1px solid var(--line-2)", display:"flex", alignItems:"center", justifyContent:"center" }}><i className={`bx ${cfg.bx}`} style={{ color:"#fff", fontSize:13 }}/></div>;
  return <img className="pd-tool-logo" src={`https://cdn.simpleicons.org/${cfg.slug}/ffffff`} alt={name} onError={e=>{ e.target.style.display="none"; }} style={{ background:"var(--space-3)", border:"1px solid var(--line-2)", padding:3, borderRadius:"var(--radius-s)" }}/>;
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App({ initialData = {}, initialView, initialProjectId }) {
  // Initialise depuis l'URL courante pour éviter tout flash au mount (composant client-only, window toujours dispo)
  // initialView/initialProjectId viennent du serveur (route /projets/[id]) :
  // serveur et client s'accordent dès le premier rendu — pas de mismatch d'hydratation
  const [view, setView] = useState(() => {
    if (initialView) return initialView;
    if (typeof window !== "undefined" && /^\/projets\/[^/]+$/.test(window.location.pathname)) return "project";
    return "home";
  });
  const [projectId, setProjectId] = useState(() => {
    if (initialProjectId) return initialProjectId;
    if (typeof window !== "undefined") {
      const m = window.location.pathname.match(/^\/projets\/([^/]+)$/);
      if (m) return m[1];
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [scrollTarget, setScrollTarget] = useState(null);
  const [cookieState, _setCookieState] = useState(() => {
    try { return localStorage.getItem("tl_cookie_consent") || null; } catch { return null; }
  });
  const setCookieState = (val) => {
    _setCookieState(val);
    try { localStorage.setItem("tl_cookie_consent", val); } catch {}
  };
  const [showCookie, setShowCookie] = useState(false);

  // Seed from server-side data (Next.js SSR) — normalize DB snake_case → frontend camelCase
  const serverProjects = initialData.projets?.length > 0 ? initialData.projets.map(fromDbProject) : null;
  const serverTestimonials = initialData.temoignages?.length > 0 ? initialData.temoignages.map(fromDbTestimonial) : null;

  const [projects] = useStorage("tl_v4_projects", serverProjects || DEFAULT_PROJECTS);
  const [tags] = useStorage("tl_v4_tags", DEFAULT_TAGS);
  const [testimonials] = useStorage("tl_v4_testimonials", serverTestimonials || DEFAULT_TESTIMONIALS);
  const [cvUrl, setCvUrlApp] = useState("https://www.thomas-leloup.fr/cv_thomas_leloup.pdf");
  const { track } = useAnalytics(cookieState === "accepted");

  useEffect(() => {
    fetch('/api/settings').then(r=>r.json()).then(s=>{ if(s?.cv_url) setCvUrlApp(s.cv_url.replace('/image/upload/', '/raw/upload/')); }).catch(()=>{});
  }, []);

  // Sync server data into local storage on each render so fresh BDD data is always used
  useEffect(() => {
    if (serverProjects) {
      try { window.storage?.set("tl_v4_projects", JSON.stringify(serverProjects)); } catch {}
    }
    if (serverTestimonials) {
      try { window.storage?.set("tl_v4_testimonials", JSON.stringify(serverTestimonials)); } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading only on first ever visit
  const [hasLoadedBefore] = useStorage("tl_loaded_before", false);

  // CSS + fonts rendus en SSR via les hoistables React 19 (voir <AppStyles/>)
  // au lieu d'une injection JS post-hydratation qui laissait le HTML nu ~2s.

  useEffect(() => {
    // Show cookie banner after loading finishes and only if not yet decided
    // … et seulement une fois le hero dépassé (ou après 15 s) : la première impression reste intacte
    if (!loading && cookieState === null) {
      let done = false;
      const show = () => { if (done) return; done = true; setShowCookie(true); };
      const onScroll = () => { if (window.scrollY > window.innerHeight * 0.6) show(); };
      const cookieTimer = setTimeout(show, 15000);
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => { clearTimeout(cookieTimer); window.removeEventListener("scroll", onScroll); };
    }
  }, [loading, cookieState]);

  const [transPhase, setTransPhase] = useState("idle"); // "idle" | "in" | "out"

  // Rideau dark : couvre l'écran (in), change la vue, repart vers le haut (out)
  const CURTAIN_MS = 420;
  const runTransition = useCallback((fn) => {
    setTransPhase("in");
    setTimeout(() => {
      fn();
      window.scrollTo(0, 0);
      setTransPhase("out");
      setTimeout(() => setTransPhase("idle"), CURTAIN_MS + 60);
    }, CURTAIN_MS);
  }, []);

  // Seed history state on mount so popstate works from the very first page
  useEffect(() => {
    const m = window.location.pathname.match(/^\/projets\/([^/]+)$/);
    window.history.replaceState(
      m ? { view: "project", id: m[1] } : { view: "home" },
      "",
      window.location.pathname
    );
  }, []);

  // Browser back / forward — rétablit la vue avec le rideau
  useEffect(() => {
    const onPop = (e) => {
      const s = e.state;
      runTransition(() => {
        if (s?.view === "project" && s.id) {
          setProjectId(s.id); setView("project");
        } else {
          setView("home"); setProjectId(null);
        }
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [runTransition]);

  const goProject = (id) => {
    runTransition(() => {
      setProjectId(id); setView("project");
      window.history.pushState({ view: "project", id }, "", `/projets/${id}`);
    });
  };
  const goHome = (target = "projets") => {
    runTransition(() => {
      setView("home"); setProjectId(null); setScrollTarget(target);
      window.history.pushState({ view: "home" }, "", "/");
    });
  };

  useEffect(() => {
    if (view === "home" && scrollTarget) {
      const t = setTimeout(() => {
        document.getElementById(scrollTarget)?.scrollIntoView({ behavior:"smooth" });
        setScrollTarget(null);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [view, scrollTarget]);

  const curtainClass = `page-curtain${transPhase === "in" ? " cin" : transPhase === "out" ? " cout" : ""}`;

  if (view === "admin") return <><AppStyles/><Suspense fallback={null}><AdminPage onBack={goHome}/></Suspense><div className={curtainClass}/></>;
  if (view === "404") return <><AppStyles/><NotFoundPage onHome={goHome}/></>;

  if (view === "project") {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return <><AppStyles/><NotFoundPage onHome={goHome}/></>;
    return (
      <ErrorBoundary onHome={goHome}>
        <>
          <AppStyles/>
          <ProjectPage key={projectId} project={p} allProjects={projects} tags={tags} testimonials={testimonials} onBack={(target)=>goHome(target||"projets")} onProject={goProject} onTrack={track} cvUrl={cvUrl}/>
          <SunSweep/>
          <MissionPanel cvHref={cvUrl ? "/api/cv" : "#"} alwaysVisible/>
          {showCookie && <CookieBanner onAccept={() => { setCookieState("accepted"); setShowCookie(false); }} onDecline={() => { setCookieState("declined"); setShowCookie(false); }}/>}
          <div className={curtainClass}/>
        </>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onHome={goHome}>
      <>
        <AppStyles/>
        <HomePage projects={projects} tags={tags} testimonials={testimonials} onProject={goProject} onTrack={track} cvUrl={cvUrl}/>
        <SunSweep/>
        {/* Loader en overlay au-dessus du contenu déjà monté : le hero se peint (LCP)
            et les images/fonts se chargent pendant l'intro au lieu d'attendre sa fin */}
        {loading && <IgnitionLoader fast={hasLoadedBefore} onDone={() => { setLoading(false); try { window.storage?.set("tl_loaded_before", "true"); } catch {} }}/>}
        <MissionPanel cvHref={cvUrl ? "/api/cv" : "#"}/>
        <FeedbackModal active={!loading && !showCookie}/>
        {showCookie && <CookieBanner onAccept={() => { setCookieState("accepted"); setShowCookie(false); }} onDecline={() => { setCookieState("declined"); setShowCookie(false); }}/>}
        <div className={curtainClass}/>
      </>
    </ErrorBoundary>
  );
}
