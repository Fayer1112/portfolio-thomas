"use client";
import React, { useEffect, useRef } from "react";
import FrameSequence from "./FrameSequence";

/*
  Soleil actif — 48 images rendues dans Blender (granulation 4D qui bouge, couronne qui ondule).
  Lecture en aller-retour à 12 i/s : pas de raccord visible, mouvement lent et continu.
  Mouvement réduit : une seule image fixe.
*/
const COUNT = 48, FPS = 12;

export default function SunActive() {
  const seq = useRef(null);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { seq.current?.setProgress(0.5); return; }
    let i = 0, dir = 1, id = 0;
    const tick = () => {
      if (document.hidden) return;
      i += dir;
      if (i >= COUNT - 1 || i <= 0) dir = -dir;
      seq.current?.setProgress(i / (COUNT - 1));
    };
    id = setInterval(tick, 1000 / FPS);
    return () => clearInterval(id);
  }, []);
  return <FrameSequence ref={seq} className="sun-seq" dir="/3d/sun" count={COUNT} fit="contain" lazyMargin="0px"/>;
}
