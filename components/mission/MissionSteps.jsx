"use client";
import React from "react";
import { STEP_META, CORE_STEPS } from "./store";

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
const nextSection = () => {
  const secs = [...document.querySelectorAll("main section[id], section.sec[id]")];
  const n = secs.find((s) => s.getBoundingClientRect().top > 80);
  n?.scrollIntoView({ behavior: "smooth", block: "start" });
};

// Liste d'étapes partagée par le pas de tir et le panneau mission.
// Chaque étape non validée est un lien vers l'endroit où la valider.
export default function MissionSteps({ m, cvHref = "/api/cv", compact = false, onNavigate }) {
  const go = (fn) => (e) => { fn(e); onNavigate?.(); };
  const action = {
    explore: <button type="button" className="ms-act" onClick={go(nextSection)}>Continuer la visite</button>,
    project: <button type="button" className="ms-act" onClick={go(() => scrollToId("projets"))}>Voir les projets</button>,
    cv: <a className="ms-act" href={cvHref} target="_blank" rel="noopener" onClick={() => onNavigate?.()}>Ouvrir le CV<span className="sr-only"> (nouvel onglet)</span></a>,
    contact: <button type="button" className="ms-act" onClick={go(() => scrollToId("contact"))}>Écrire</button>,
  };
  const keys = [...CORE_STEPS, "contact"];
  return (
    <ol className={`ms${compact ? " ms-compact" : ""}`}>
      {keys.map((k) => {
        const meta = STEP_META[k], done = m[k], boost = k === "contact";
        const pct = k === "explore" && !done ? Math.round((m.explorePct || 0) * 100) : null;
        return (
          <li key={k} className={`ms-step${done ? " is-done" : ""}${boost ? " is-boost" : ""}`}>
            <span className="ms-dot" aria-hidden="true">
              {done ? <svg viewBox="0 0 16 16" width="12" height="12"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : boost ? "+" : meta.n}
            </span>
            <span className="ms-body">
              <span className="ms-label">
                {meta.label}
                {boost && <span className="ms-tag">Boost · optionnel</span>}
                <span className="sr-only">{done ? " — validée" : " — à faire"}</span>
              </span>
              {!compact && <span className="ms-hint">{done ? (boost ? "Poussée maximale activée" : "Validée") : meta.hint}{pct ? ` · ${pct} %` : ""}</span>}
              {pct !== null && <span className="ms-bar" aria-hidden="true"><span style={{ transform: `scaleX(${m.explorePct || 0})` }}/></span>}
            </span>
            {!done && action[k]}
          </li>
        );
      })}
    </ol>
  );
}
