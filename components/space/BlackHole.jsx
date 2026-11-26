"use client";
import React, { useEffect, useRef, useState } from "react";
import FrameSequence from "./FrameSequence";

/*
  Trou noir — transition de chapitre avant Projets (rendu Blender, 60 images).
  1. Approche : tant qu'il entre dans l'écran, il vient vers nous (échelle 0,6 → 1),
     halo violet diffus qui respire. Rien n'est piloté image par image par le scroll.
  2. Déclenché : quand sa section est bien à l'écran, la séquence COMPLÈTE se joue seule (2,6 s),
     dans sa propre section (jamais par-dessus les autres). Le scroll n'est jamais bloqué.
  3. Retour : si on remonte, sens inverse allégé (1,1 s, une image sur deux), puis l'approche reprend.
  Mouvement réduit : image fixe, pas de lecture automatique.
*/
const COUNT = 60;
const FWD_MS = 2600, REV_MS = 1100;
// Courbe douce (sinusoïdale) : départ et arrivée en douceur, sans à-coup au milieu
const easeInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export default function BlackHole() {
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const seqRef = useRef(null);
  const [mobile, setMobile] = useState(false);
  useEffect(() => { setMobile(!!window.matchMedia?.("(max-width:768px)").matches); }, []);

  useEffect(() => {
    const wrap = wrapRef.current, stage = stageRef.current;
    if (!wrap || !stage) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let phase = "approach"; // approach | fwd | done | rev
    let p = 0, raf = 0, from = 0, to = 0, t0 = 0, dur = 0;

    const setP = (v) => {
      p = v;
      seqRef.current?.setProgress(v);
      stage.classList.toggle("tun", v > 0.58);
      stage.style.setProperty("--bhp", v.toFixed(3));
    };
    const finish = () => {
      raf = 0;
      if (phase === "fwd") { phase = "done"; stage.classList.remove("is-playing"); stage.classList.add("is-done"); }
      else { phase = "approach"; stage.classList.remove("is-playing", "is-rev", "is-done"); setP(0); onScroll(); }
    };
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = easeInOut(t);
      let v = from + (to - from) * e;
      if (phase === "rev") v = Math.round(v * (COUNT / 2)) / (COUNT / 2); // une image sur deux
      setP(v);
      if (t < 1) raf = requestAnimationFrame(step); else finish();
    };
    const play = (dir) => {
      cancelAnimationFrame(raf);
      phase = dir; from = p; to = dir === "fwd" ? 1 : 0;
      dur = (dir === "fwd" ? FWD_MS : REV_MS) * Math.max(0.25, Math.abs(to - from));
      t0 = performance.now();
      stage.classList.remove("is-done");
      stage.classList.add("is-playing");
      stage.classList.toggle("is-rev", dir === "rev");
      raf = requestAnimationFrame(step);
    };

    function onScroll() {
      const r = wrap.getBoundingClientRect(), vh = window.innerHeight;
      // approche : 0 quand le haut de la section touche le bas de l'écran, 1 quand il touche le haut
      const a = Math.min(1, Math.max(0, 1 - r.top / vh));
      stage.style.setProperty("--bha", a.toFixed(3));
      if (reduce) return;
      // Traversée rapide (lien du menu) : la section sort de l'écran pendant la lecture → état final direct
      const away = r.bottom < 0 || r.top > vh;
      if (away && (phase === "fwd" || phase === "rev")) {
        cancelAnimationFrame(raf);
        const past = r.bottom < 0;
        phase = past ? "fwd" : "rev"; setP(past ? 1 : 0); finish();
        return;
      }
      if (away) return;
      // section bien cadrée → lecture complète ; on remonte au-dessus → retour allégé
      if ((phase === "approach" || phase === "rev") && r.top < vh * 0.2 && r.bottom > vh * 0.6) play("fwd");
      else if ((phase === "done" || phase === "fwd") && r.top > vh * 0.45) play("rev");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    setP(0); onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll);
    };
  }, [mobile]);

  return (
    <div ref={wrapRef} className="bh" aria-hidden="true">
      <div ref={stageRef} className="bh-stage">
        <div className="bh-halo"><span/><span/></div>
        <FrameSequence key={mobile ? "m" : "d"} ref={seqRef} className="bh-seq" dir={mobile ? "/3d/black-hole-mobile" : "/3d/black-hole"} count={COUNT}/>
      </div>
    </div>
  );
}
