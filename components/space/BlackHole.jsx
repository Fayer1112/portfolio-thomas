"use client";
import React, { useEffect, useRef, useState } from "react";
import FrameSequence from "./FrameSequence";

/*
  Trou noir — transition de chapitre avant Projets (rendu Blender, 60 images).
  1. Approche : tant qu'il entre dans l'écran, il vient vers nous (échelle 0,6 → 1),
     halo violet diffus qui respire. Rien n'est piloté image par image par le scroll.
  2. Déclenché : quand il occupe l'écran, la séquence COMPLÈTE se joue seule (2,6 s),
     en surimpression fixe : aspiration, noir total, tunnel, sortie. Le scroll n'est jamais bloqué.
  3. Retour : si on remonte, sens inverse allégé (1,1 s, une image sur deux), puis l'approche reprend.
  Mouvement réduit : image fixe, pas de lecture automatique.
*/
const COUNT = 60;
const FWD_MS = 2600, REV_MS = 1100;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
      document.body.classList.remove("bht-active");
    };
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = phase === "fwd" ? easeInOut(t) : t;
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
      document.body.classList.add("bht-active");
      raf = requestAnimationFrame(step);
    };

    function onScroll() {
      const r = wrap.getBoundingClientRect(), vh = window.innerHeight;
      // approche : 0 quand le haut du bloc touche le bas de l'écran, 1 quand il touche le haut
      const a = Math.min(1, Math.max(0, 1 - r.top / vh));
      stage.style.setProperty("--bha", a.toFixed(3));
      if (reduce) return;
      // Traversée rapide (lien du menu, saut de page) : le bloc quitte l'écran pendant la lecture,
      // on saute directement à l'état final au lieu de recouvrir la destination.
      const away = r.bottom < -vh * 0.25 || r.top > vh * 1.1;
      if (away && (phase === "fwd" || phase === "rev")) {
        cancelAnimationFrame(raf);
        const past = r.bottom < 0;
        phase = past ? "fwd" : "rev"; setP(past ? 1 : 0); finish();
        return;
      }
      if (away) return;
      if ((phase === "approach" || phase === "rev") && r.top < vh * 0.08 && r.bottom > 0) play("fwd");
      else if ((phase === "done" || phase === "fwd") && r.top > vh * 0.3) play("rev");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    setP(0); onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll);
      document.body.classList.remove("bht-active");
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
