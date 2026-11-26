"use client";
import React from "react";
import PlanetGL from "./PlanetGL";
import { useMission } from "../mission/store";

/*
  Scène « Qui suis-je » : une vraie photo, présentée comme une photo (cadre, légende),
  et la planète à anneau du badge en temps réel derrière elle. Plus de détourage
  ni de logo collé sur la planète. Le badge « 4+ ans » reste fixe et lisible.
  Si la mission a été boostée (message envoyé), la fusée orbite autour de la planète.
*/
export default function AboutScene() {
  const m = useMission();
  const orbit = m.launched && m.contact;
  return (
    <div className="abs">
      <div className="abs-planet">
        <PlanetGL ring palette="dusk" tilt={-0.32} view={0.2} scale={0.42} period={120} parallax={8} scrollParallax={0.05}
          fallback="/3d/ring-planet/planet.webp"/>
        {orbit && (
          <div className="abs-orbit" aria-hidden="true">
            <span className="abs-orbiter">
              <svg viewBox="0 0 20 40" width="10" height="20"><path d="M10 1c4 4 5 10 5 16v12H5V17C5 11 6 5 10 1z" fill="#ECE8FF"/><path d="M5 22l-4 8h4zM15 22l4 8h-4z" fill="#7C3AED"/><path d="M7 30c.5 4 1.6 7 3 9 1.4-2 2.5-5 3-9z" fill="#FFD29A"/></svg>
            </span>
          </div>
        )}
      </div>
      <figure className="abs-photo">
        <img src="/about-config.webp" alt="Thomas Leloup à Figma Config 2024, à côté du logo Figma géant" width="640" height="800" loading="lazy"/>
        <figcaption>Figma Config 2024 · San Francisco</figcaption>
      </figure>
      <div className="abs-badge">
        <span className="abs-badge-n">4+</span>
        <span className="abs-badge-l">ans<br/>d'expérience</span>
      </div>
    </div>
  );
}
