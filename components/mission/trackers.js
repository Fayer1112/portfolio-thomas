"use client";
import { useEffect } from "react";
import { mission } from "./store";

// Étape 1 — une section compte comme « vue » après 1 s à l'écran
// (au moins 35 % d'elle visible, ou la moitié de l'écran occupée).
// Validée quand toutes les sections sauf une ont été vues : un scroll éclair ne suffit pas.
export function useExploreTracker(deps = []) {
  useEffect(() => {
    const secs = [...document.querySelectorAll("section[id]")].filter((s) => s.id !== "contact-form");
    if (!secs.length) return;
    const need = Math.max(1, secs.length - 1);
    const seen = new Set(), timers = new Map();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = e.target.id;
        const big = e.intersectionRatio >= 0.35 || e.intersectionRect.height >= window.innerHeight * 0.5;
        if (e.isIntersecting && big && !seen.has(id) && !timers.has(id)) {
          timers.set(id, setTimeout(() => {
            seen.add(id); timers.delete(id);
            const pct = Math.min(1, seen.size / need);
            mission.setExplore(pct);
            if (seen.size >= need) mission.complete("explore");
          }, 1000));
        } else if (!big && timers.has(id)) { clearTimeout(timers.get(id)); timers.delete(id); }
      }
    }, { threshold: [0, 0.2, 0.35, 0.5, 0.75] });
    secs.forEach((s) => io.observe(s));
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Étape 2 — page projet ouverte 5 s, ou 40 % de la page lue
export function useProjectTracker(active = true) {
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => mission.complete("project"), 5000);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.4) mission.complete("project");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, [active]);
}
