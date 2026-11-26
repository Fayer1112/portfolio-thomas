import React from "react";

/*
  Fusée vectorielle provisoire — même lumière que le reste du site
  (clé chaude en haut à droite, contour violet à gauche). Elle sera remplacée
  par le rendu Blender (image fixe + séquence de décollage) sans toucher à la mécanique :
  LaunchPad ne pilote que les classes .rk-* (étage, flamme, vapeur).
*/
export default function Rocket({ idPrefix = "rk" }) {
  const g = (k) => `${idPrefix}-${k}`;
  return (
    <g className="rk">
      <defs>
        <linearGradient id={g("hull")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#2A1B5E"/>
          <stop offset=".22" stopColor="#7E70B8"/>
          <stop offset=".6" stopColor="#ECE8FF"/>
          <stop offset=".84" stopColor="#FFF0DC"/>
          <stop offset="1" stopColor="#A996E6"/>
        </linearGradient>
        <linearGradient id={g("fin")} x1="0" x2="1">
          <stop offset="0" stopColor="#26135A"/>
          <stop offset=".7" stopColor="#6025C0"/>
          <stop offset="1" stopColor="#A78BFA"/>
        </linearGradient>
        <radialGradient id={g("win")} cx=".62" cy=".35" r=".7">
          <stop offset="0" stopColor="#FFE2B8"/>
          <stop offset=".35" stopColor="#8B5CF6"/>
          <stop offset="1" stopColor="#1A0B45"/>
        </radialGradient>
        <linearGradient id={g("nozzle")} x1="0" x2="1">
          <stop offset="0" stopColor="#1C1D2E"/>
          <stop offset=".65" stopColor="#5E5A80"/>
          <stop offset="1" stopColor="#2A2840"/>
        </linearGradient>
        <radialGradient id={g("flame")} cx=".5" cy=".08" r=".95">
          <stop offset="0" stopColor="#FFFFFF"/>
          <stop offset=".2" stopColor="#FFE7B0"/>
          <stop offset=".5" stopColor="#F59E0B"/>
          <stop offset=".85" stopColor="#F97316" stopOpacity=".55"/>
          <stop offset="1" stopColor="#C45C00" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={g("flameBoost")} cx=".5" cy=".08" r=".95">
          <stop offset="0" stopColor="#FFFFFF"/>
          <stop offset=".35" stopColor="#E7E2FF"/>
          <stop offset=".62" stopColor="#C4B5FD"/>
          <stop offset=".88" stopColor="#8B5CF6" stopOpacity=".5"/>
          <stop offset="1" stopColor="#7C3AED" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* Flamme (sous la tuyère) — invisible au repos */}
      <g className="rk-flame">
        <path className="rk-flame-normal" d="M42 262 C40 300 50 340 60 372 C70 340 80 300 78 262 Z" fill={`url(#${g("flame")})`}/>
        <path className="rk-flame-boost" d="M38 262 C34 318 48 380 60 420 C72 380 86 318 82 262 Z" fill={`url(#${g("flameBoost")})`}/>
        <ellipse className="rk-flame-core" cx="60" cy="268" rx="13" ry="7" fill="#FFF7E6"/>
      </g>

      {/* Étage inférieur (se sépare en mode boost) */}
      <g className="rk-stage-low">
        <path d="M44 250 L40 266 L80 266 L76 250 Z" fill={`url(#${g("nozzle")})`}/>
        <path d="M38 168 L82 168 L82 252 L38 252 Z" fill={`url(#${g("hull")})`}/>
        <path d="M38 212 L82 212 L82 220 L38 220 Z" fill="#7C3AED" opacity=".85"/>
        <path d="M38 196 L14 246 L14 258 L38 246 Z" fill={`url(#${g("fin")})`}/>
        <path d="M82 196 L106 246 L106 258 L82 246 Z" fill={`url(#${g("fin")})`}/>
        <path d="M58 200 L62 200 L62 262 L58 262 Z" fill="#26135A" opacity=".55"/>
      </g>

      {/* Étage supérieur */}
      <g className="rk-stage-up">
        <path d="M60 8 C80 34 84 70 82 104 L82 168 L38 168 L38 104 C36 70 40 34 60 8 Z" fill={`url(#${g("hull")})`}/>
        <path d="M38 162 L82 162 L82 168 L38 168 Z" fill="#26135A" opacity=".7"/>
        <circle cx="60" cy="98" r="11" fill="#1A0B45"/>
        <circle cx="60" cy="98" r="8.5" fill={`url(#${g("win")})`}/>
        <path d="M44 132 L76 132" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round"/>
        <path d="M60 8 C66 16 70 24 73 34 L47 34 C50 24 54 16 60 8 Z" fill="#7C3AED"/>
      </g>
    </g>
  );
}
