"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Rocket from "./Rocket";
import MissionSteps from "./MissionSteps";
import { mission, useMission, coreDone, isReady } from "./store";

/*
  Pas de tir — la mission se termine ici.
  3 étapes validées + pas de tir à l'écran (ou clic « Lancer ») → 3… 2… 1… décollage.
  Contact envoyé avant → décollage boosté (flamme blanche, poussée x2, séparation d'étage).
  Séquence : T-3 la page s'assombrit, les feux de la tour s'allument · T-0 allumage, secousse,
  vapeur · 0→3 s ascension, étoiles étirées, lumière chaude qui balaie le site · fin : mission accomplie.
*/
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const LIFT_MS = 3200;

function Warp({ on, boost }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!on) return;
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = cv.width = Math.round(innerWidth * dpr), H = cv.height = Math.round(innerHeight * dpr);
    const N = boost ? 200 : 120;
    const st = Array.from({ length: N }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7 }));
    const t0 = performance.now(); let raf = 0;
    const tick = (now) => {
      const t = (now - t0) / LIFT_MS;
      const ramp = Math.min(1, t * 1.6) * (t > 0.75 ? Math.max(0, 1 - (t - 0.75) * 4) : 1);
      const speed = (boost ? 46 : 30) * ramp * dpr;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";
      for (const s of st) {
        s.y += speed * s.z;
        if (s.y > H + 40) { s.y = -40; s.x = Math.random() * W; }
        const len = 2 + speed * s.z * 3.2;
        const a = (boost ? 0.55 : 0.42) * s.z;
        const gr = ctx.createLinearGradient(s.x, s.y, s.x, s.y - len);
        gr.addColorStop(0, boost ? `rgba(221,214,254,${a})` : `rgba(240,237,255,${a})`);
        gr.addColorStop(1, "rgba(240,237,255,0)");
        ctx.strokeStyle = gr;
        ctx.lineWidth = (0.4 + s.z * 0.9) * dpr;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y - len); ctx.stroke();
      }
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, boost]);
  return <canvas ref={ref} className={`lp-warp${on ? " on" : ""}`} aria-hidden="true"/>;
}

export default function LaunchPad({ cvHref }) {
  const m = useMission();
  const ready = isReady(m);
  const [seq, setSeq] = useState("idle"); // idle | count | lift | done
  const [count, setCount] = useState(3);
  const [live, setLive] = useState("");
  const [boostRun, setBoostRun] = useState(false);
  const timers = useRef([]);
  const stageRef = useRef(null);
  const auto = useRef(false);

  // Mission déjà accomplie lors d'une visite précédente → pas de tir vide
  useEffect(() => { if (mission.get().launched) setSeq("done"); }, []);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const at = (ms, fn) => timers.current.push(setTimeout(fn, ms));
  const endBody = () => document.body.classList.remove("tl-countdown", "tl-liftoff", "tl-boost");

  const finish = useCallback((boost) => {
    clear(); endBody();
    setSeq("done"); setLive("Mission accomplie.");
    mission.launched(boost);
  }, []);

  const start = useCallback(() => {
    if (!isReady(mission.get())) return;
    clear();
    const boost = !!mission.get().contact;
    setBoostRun(boost);
    setSeq("count"); setCount(3);
    setLive("Décollage dans 3");
    document.body.classList.add("tl-countdown");
    if (boost) document.body.classList.add("tl-boost");
    at(1000, () => { setCount(2); setLive("2"); });
    at(2000, () => { setCount(1); setLive("1"); });
    at(3000, () => { setSeq("lift"); setLive(boost ? "Décollage, poussée maximale !" : "Décollage !"); document.body.classList.add("tl-liftoff"); });
    at(3000 + (reduced() ? 1400 : LIFT_MS), () => finish(boost));
  }, [finish]);

  // Démarrage automatique quand le pas de tir est bien à l'écran et la mission prête
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      const s = mission.get();
      if (e.intersectionRatio >= 0.55 && isReady(s) && !s.launched && !auto.current) {
        auto.current = true;
        setTimeout(() => { if (!mission.get().launched) start(); }, 500);
      }
    }, { threshold: [0, 0.55, 0.8] });
    io.observe(el);
    return () => io.disconnect();
  }, [start, ready]);

  // Prêt pendant que le pas de tir est déjà visible
  useEffect(() => {
    if (!ready || m.launched || auto.current || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    if (r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.4) { auto.current = true; start(); }
  }, [ready, m.launched, start]);

  useEffect(() => () => { clear(); endBody(); }, []);

  const replay = () => { auto.current = true; start(); };
  const running = seq === "count" || seq === "lift";
  const done = coreDone(m);
  const lights = [m.explore, m.project, m.cv];

  let status;
  if (seq === "done") status = (
    <div className="lp-status is-done">
      <p className="lp-status-title">Mission accomplie{m.boosted ? " · poussée maximale" : ""}</p>
      <p className="lp-status-txt">
        Merci d'avoir fait le tour. Ce parcours, c'est ma façon de concevoir : des étapes claires, un retour à chaque action,
        et un objectif qu'on a envie d'atteindre sans y être forcé.
        {!m.contact && <> Un projet en tête ? <a href="#contact" className="lp-link">Écrivez-moi</a>, la fusée se mettra en orbite.</>}
      </p>
      <button type="button" className="btn-ds btn-ds-ghost" onClick={replay}>Revoir le décollage</button>
    </div>
  );
  else if (running) status = (
    <div className="lp-status">
      <button type="button" className="btn-ds btn-ds-ghost" onClick={() => finish(boostRun)}>Passer l'animation</button>
    </div>
  );
  else if (ready) status = (
    <div className="lp-status is-ready">
      <p className="lp-status-title">Prêt au décollage</p>
      <button type="button" className="btn-ds btn-ds-energy" onClick={replay}>Lancer le compte à rebours</button>
    </div>
  );
  else status = (
    <div className="lp-status">
      <p className="lp-status-title">{done} étape{done > 1 ? "s" : ""} sur 3</p>
      <p className="lp-status-txt">Chaque étape allume un feu de la tour. À trois, la fusée décolle.</p>
    </div>
  );

  return (
    <section className={`sec lp lp-${seq}${boostRun || (seq === "done" && m.boosted) ? " lp-boosted" : ""}`} id="launchpad" aria-labelledby="lp-title">
      <div className="seye rv">Mission</div>
      <h2 className="stit rv" id="lp-title">Pas de tir</h2>
      <div className="lp-grid">
        <div className="lp-stage" ref={stageRef}>
          <svg className="lp-svg" viewBox="0 0 360 520" aria-hidden="true">
            <defs>
              <linearGradient id="lp-tower" x1="0" x2="1"><stop offset="0" stopColor="#171826"/><stop offset="1" stopColor="#282940"/></linearGradient>
              <radialGradient id="lp-pool" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#F59E0B" stopOpacity=".55"/><stop offset="1" stopColor="#F59E0B" stopOpacity="0"/></radialGradient>
            </defs>
            {/* halo d'allumage au sol */}
            <ellipse className="lp-pool" cx="200" cy="470" rx="150" ry="34" fill="url(#lp-pool)"/>
            {/* tour de lancement */}
            <g className="lp-tower">
              <rect x="64" y="96" width="28" height="372" fill="url(#lp-tower)" stroke="#282940"/>
              {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M64 ${110 + i * 30} L92 ${128 + i * 30}`} stroke="#282940" strokeWidth="2"/>)}
              <path className="lp-arm" d="M92 210 L146 210 L146 220 L92 220 Z" fill="#282940"/>
              <path className="lp-arm" d="M92 330 L146 330 L146 340 L92 340 Z" fill="#282940"/>
              {lights.map((on, i) => (
                <circle key={i} className={`lp-light${on ? " on" : ""}`} cx="78" cy={420 - i * 100} r="5"/>
              ))}
              <circle className={`lp-light lp-light-boost${m.contact ? " on" : ""}`} cx="78" cy="104" r="5"/>
            </g>
            {/* plateforme */}
            <path d="M40 468 L340 468 L320 492 L60 492 Z" fill="#111220" stroke="#282940"/>
            <path d="M150 468 L250 468 L240 478 L160 478 Z" fill="#07080F"/>
            {/* vapeur */}
            <g className="lp-smoke">
              {[-110, -70, -30, 30, 70, 110].map((dx, i) => <circle key={i} cx={200 + dx * 0.4} cy="470" r="26" style={{ "--dx": `${dx}px`, "--d": `${i * 40}ms` }}/>)}
            </g>
            {/* fusée */}
            <g className="lp-rocket-pos" transform="translate(140 196)">
              <g className="lp-rocket"><Rocket idPrefix="lp"/></g>
            </g>
          </svg>
          {running && seq === "count" && (
            <div className="lp-num" aria-hidden="true"><span key={count}>{count}</span></div>
          )}
          {seq === "lift" && <div className="lp-num lp-go" aria-hidden="true"><span>Décollage</span></div>}
          <svg className="lp-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="47" pathLength="1" style={{ strokeDashoffset: seq === "count" ? (count - 1) / 3 : running || seq === "done" ? 0 : 1 }}/>
          </svg>
        </div>
        <div className="lp-side">
          <p className="lp-lead">
            Trois étapes suffisent pour lancer la fusée. Le message est un boost : il rend le décollage plus puissant, mais personne n'est obligé d'écrire pour voir la fin.
          </p>
          <MissionSteps m={m} cvHref={cvHref}/>
          {status}
        </div>
      </div>
      <Warp on={seq === "lift" && !reduced()} boost={boostRun}/>
      <div className="lp-sweep" aria-hidden="true"/>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{live}</div>
    </section>
  );
}
