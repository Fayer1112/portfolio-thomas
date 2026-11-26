"use client";
import { useSyncExternalStore } from "react";

/*
  Mission — état de la gamification, partagé par tout le site.
  3 étapes principales (ordre libre) → décollage. Le contact est un boost optionnel.
  Gardé dans le navigateur du visiteur : un recruteur qui revient retrouve sa mission.
*/
const KEY = "tl_mission_v1";
export const CORE_STEPS = ["explore", "project", "cv"];
export const STEP_META = {
  explore: { n: 1, label: "Parcourir le site", hint: "Descendre jusqu'en bas, section par section" },
  project: { n: 2, label: "Consulter un projet", hint: "Ouvrir une étude de cas" },
  cv:      { n: 3, label: "Ouvrir le CV", hint: "Le bouton « Mon CV »" },
  contact: { n: 4, label: "Envoyer un message", hint: "Boost : décollage plus puissant" },
};

const EMPTY = { explore: false, project: false, cv: false, contact: false, explorePct: 0, launched: false, boosted: false };
let state = EMPTY;
let loaded = false;
const subs = new Set();
const listeners = new Set(); // événements ponctuels (toasts, annonces)

const load = () => {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) state = { ...EMPTY, ...s }; } catch {}
};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
const set = (patch) => { state = { ...state, ...patch }; save(); subs.forEach((f) => f()); };
const emit = (evt) => listeners.forEach((f) => f(evt));

export const coreDone = (s = state) => CORE_STEPS.filter((k) => s[k]).length;
export const isReady = (s = state) => coreDone(s) === CORE_STEPS.length;

export const mission = {
  get: () => { load(); return state; },
  complete(step) {
    load();
    if (state[step]) return;
    set({ [step]: true, ...(step === "explore" ? { explorePct: 1 } : null) });
    emit({ type: "step", step, done: coreDone(), ready: isReady() });
  },
  setExplore(pct) {
    load();
    if (state.explore || pct <= state.explorePct) return;
    set({ explorePct: pct });
  },
  launched(boosted) { load(); set({ launched: true, boosted: state.boosted || boosted }); emit({ type: "launched", boosted }); },
  reset() { set({ ...EMPTY }); },
  on(f) { listeners.add(f); return () => listeners.delete(f); },
  subscribe(f) { subs.add(f); return () => subs.delete(f); },
};

const SERVER = EMPTY;
export function useMission() {
  return useSyncExternalStore(mission.subscribe, mission.get, () => SERVER);
}

// Clic sur un lien vers le CV, où qu'il soit sur le site
export function installCvTracker() {
  const onClick = (e) => {
    const a = e.target.closest?.("a[href]");
    if (a && /\/api\/cv|\.pdf($|\?)/i.test(a.getAttribute("href") || "")) mission.complete("cv");
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
