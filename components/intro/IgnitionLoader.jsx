"use client";
import React, { useEffect, useRef, useState } from "react";
import Monogram from "../brand/Monogram";

/*
  Loader « Allumage » — la première image du hero, encore éteinte.
  - Rien d'affiché pendant 300 ms : si tout est prêt avant, on passe directement (pas de flash).
  - L'anneau suit la VRAIE progression : HTML (déjà là, rendu serveur), polices, planète du hero.
  - Prêt → l'arc se ferme, une lueur chaude le parcourt, puis l'anneau s'élargit et s'incline
    vers la planète pendant que le voile se lève (700 ms).
  - Plafond 2,5 s : on sort quoi qu'il arrive, la planète finira en fondu.
  - Visiteur récurrent : fondu 200 ms. prefers-reduced-motion : pas de tracé ni d'élargissement.
*/
const SHOW_AFTER = 300;
const CAP = 2500;

export const HERO_READY_EVENT = "tl:hero-ready";
export const markHeroReady = () => {
  if (typeof window === "undefined") return;
  window.__tlHeroReady = true;
  window.dispatchEvent(new Event(HERO_READY_EVENT));
};

export default function IgnitionLoader({ fast = false, onDone }) {
  const [phase, setPhase] = useState("wait"); // wait | show | ready | out
  const [progress, setProgress] = useState(1 / 3);
  const doneRef = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.body.classList.add("tl-loading");
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    let shown = false, finished = false, fonts = false, hero = !!window.__tlHeroReady;

    const finish = (quick) => {
      if (finished) return; finished = true;
      setProgress(1);
      const exit = () => {
        setPhase("out");
        document.body.classList.remove("tl-loading");
        later(() => { if (!doneRef.current) { doneRef.current = true; onDone?.(); } }, quick || reduce ? 220 : 720);
      };
      if (quick || reduce || !shown) exit();
      else { setPhase("ready"); later(exit, 380); }
    };
    const update = () => {
      setProgress((1 + (fonts ? 1 : 0) + (hero ? 1 : 0)) / 3);
      if (fonts && hero) finish(false);
    };
    if (fast) { finish(true); return () => timers.forEach(clearTimeout); }

    const onHero = () => { hero = true; update(); };
    window.addEventListener(HERO_READY_EVENT, onHero);
    (document.fonts?.ready || Promise.resolve()).then(() => { fonts = true; update(); });
    later(() => { if (!finished) { shown = true; setPhase("show"); } }, SHOW_AFTER);
    later(() => finish(false), CAP);
    update();
    return () => { window.removeEventListener(HERO_READY_EVENT, onHero); timers.forEach(clearTimeout); document.body.classList.remove("tl-loading"); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`ign ign-${phase}`} aria-hidden={phase === "out"}>
      <div role="status" className="sr-only">{phase === "out" ? "" : "Chargement"}</div>
      <div className="ign-stage">
        <svg className="ign-ring" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="92" className="ign-track"/>
          <circle cx="100" cy="100" r="92" pathLength="1" className="ign-arc" style={{ strokeDashoffset: 1 - progress }}/>
          <circle cx="100" cy="100" r="92" pathLength="1" className="ign-glint"/>
        </svg>
        <Monogram size={56} trace className="ign-logo"/>
      </div>
    </div>
  );
}
