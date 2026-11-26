"use client";
import React, { useEffect, useRef, useState } from "react";
import MissionSteps from "./MissionSteps";
import { mission, useMission, coreDone, isReady, STEP_META, installCvTracker } from "./store";

/*
  Panneau mission — pastille discrète en bas à gauche, n'apparaît qu'après le hero.
  Repliée : une fusée entourée de 3 segments. Dépliée : les étapes, chacune cliquable.
  À chaque étape validée : un toast court qui propose la suivante (jamais de modale,
  jamais de focus volé).
*/
export default function MissionPanel({ cvHref, alwaysVisible = false }) {
  const m = useMission();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(alwaysVisible);
  const [toast, setToast] = useState(null);
  const tRef = useRef(0);
  const panelRef = useRef(null);

  useEffect(() => installCvTracker(), []);

  useEffect(() => {
    if (alwaysVisible) return;
    const fn = () => setShown(window.scrollY > window.innerHeight * 0.8);
    fn(); window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [alwaysVisible]);

  useEffect(() => mission.on((e) => {
    if (e.type !== "step") return;
    const s = mission.get();
    const next = ["explore", "project", "cv"].find((k) => !s[k]);
    let text;
    if (e.step === "contact") text = s.launched ? "Boost reçu : la fusée part en orbite." : "Boost activé : le décollage sera plus puissant.";
    else if (e.ready) text = "3 sur 3 : la fusée est prête au décollage.";
    else text = `Étape ${e.done} sur 3 validée. Suivante : ${STEP_META[next].label.toLowerCase()}.`;
    setToast({ text, ready: e.ready && e.step !== "contact", id: Date.now() });
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), 4200);
  }), []);

  // Échap referme ; clic à l'extérieur aussi
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e) => { if (!panelRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("keydown", onKey); document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  const done = coreDone(m), ready = isReady(m);
  const goPad = () => { setOpen(false); document.getElementById("launchpad")?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const segs = [m.explore, m.project, m.cv];
  const C = 2 * Math.PI * 19;

  return (
    <div ref={panelRef} className={`mp${shown || open ? " is-shown" : ""}${ready ? " is-ready" : ""}${m.launched ? " is-launched" : ""}`}>
      {toast && (
        <div className="mp-toast" key={toast.id} role="status">
          <span>{toast.text}</span>
          {toast.ready && document.getElementById("launchpad") && <button type="button" className="mp-toast-act" onClick={goPad}>Aller au pas de tir</button>}
        </div>
      )}
      {open && (
        <div className="mp-card" id="mission-card" role="region" aria-label="Mission">
          <div className="mp-head">
            <span className="mp-eyebrow">Mission</span>
            <span className="mp-count">{m.launched ? "Accomplie" : `${done} / 3`}</span>
          </div>
          <MissionSteps m={m} cvHref={cvHref} compact onNavigate={() => setOpen(false)}/>
          {ready && !m.launched && document.getElementById("launchpad") && (
            <button type="button" className="btn-ds btn-ds-energy mp-launch" onClick={goPad}>Lancer</button>
          )}
        </div>
      )}
      <button type="button" className="mp-pill" aria-expanded={open} aria-controls="mission-card" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 44 44" width="40" height="40" aria-hidden="true">
          <circle cx="22" cy="22" r="19" className="mp-track"/>
          {segs.map((on, i) => (
            <circle key={i} cx="22" cy="22" r="19" className={`mp-seg${on ? " on" : ""}`}
              strokeDasharray={`${C / 3 - 4} ${C}`} strokeDashoffset={-(C / 3) * i} transform="rotate(-90 22 22)"/>
          ))}
          <path d="M22 11c3.2 3 4.4 7 4 11.5v5.5h-8v-5.5c-.4-4.5.8-8.5 4-11.5z" className="mp-rk"/>
          <path d="M18 24l-3 5h3zM26 24l3 5h-3z" className="mp-rk-fin"/>
          <path d="M20 29.5c.4 2.4 1.2 3.8 2 4.5.8-.7 1.6-2.1 2-4.5z" className="mp-rk-flame"/>
        </svg>
        <span className="mp-pill-txt">
          <span className="mp-pill-label">Mission</span>
          <span className="mp-pill-val">{m.launched ? "Accomplie" : ready ? "Prêt" : `${done} / 3`}</span>
        </span>
      </button>
    </div>
  );
}
