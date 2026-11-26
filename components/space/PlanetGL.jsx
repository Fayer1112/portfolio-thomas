"use client";
import React, { useEffect, useRef } from "react";

/*
  PlanetGL — planète en temps réel (WebGL 1, aucune dépendance).
  Lancer de rayons dans le fragment shader : une sphère + (option) un anneau plan,
  éclairés par LA lumière du site (le soleil, en haut à droite). Ombre de l'anneau
  sur la planète et de la planète sur l'anneau.

  Surface : texture équirectangulaire cuite dans Blender si `texture` est fourni
  (2:1, raccord gauche/droite), sinon bandes procédurales dans la palette de marque.
  Rotation propre : 1 tour en `period` secondes. Parallaxe : souris + scroll, amortie.
  Mouvement réduit / pas de WebGL : une seule image fixe, rien ne bouge.
  En pause hors écran et onglet caché.
*/

const VERT = `attribute vec2 p;varying vec2 v;void main(){v=p;gl_Position=vec4(p,0.,1.);}`;

const FRAG = `
precision highp float;
varying vec2 v;
uniform vec2 uRes;
uniform float uRot;      // rotation propre (radians)
uniform float uTilt;     // inclinaison de l'axe / de l'anneau (radians)
uniform float uView;     // élévation de la caméra (radians)
uniform float uRing;     // 0 ou 1
uniform float uHasTex;
uniform sampler2D uTex;
uniform vec3 uLight;     // direction vers le soleil (normalisée)
uniform vec3 cDeep; uniform vec3 cMid; uniform vec3 cHi; uniform vec3 cRim; uniform vec3 cSun;
uniform float uScale;    // rayon de la planète en unités écran

float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}

mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0,-s,c,0,0,0,1);}

vec3 surface(vec3 q){
  // q : point sur la sphère, repère de la planète (axe = y)
  float lon=atan(q.z,q.x)+uRot, lat=asin(clamp(q.y,-1.,1.));
  if(uHasTex>.5){
    vec2 uv=vec2(fract(lon/6.2831853),.5-lat/3.1415926);
    return texture2D(uTex,uv).rgb;
  }
  // bandes de géante gazeuse, turbulence douce qui se déplace avec la rotation
  vec2 w=vec2(cos(lon),sin(lon));
  float t=fbm(vec2(lat*9.,0.)+w*1.6+fbm(w*2.2+lat*3.)*1.3);
  float b=sin(lat*14.+t*4.)*.5+.5;
  vec3 c=mix(cDeep,cMid,smoothstep(.15,.85,b));
  c=mix(c,cHi,smoothstep(.72,1.,t)*.55);
  return c;
}

void main(){
  vec2 uv=v*vec2(uRes.x/uRes.y,1.)/uScale;
  // caméra orthographique légèrement plongeante
  mat3 cam=rx(uView);
  vec3 ro=cam*vec3(uv,-6.), rd=cam*vec3(0,0,1);
  mat3 tilt=rz(uTilt);
  vec3 nrm=tilt*vec3(0,1,0);          // normale de l'anneau = axe de la planète
  vec3 L=normalize(uLight);

  vec4 col=vec4(0.);
  // ── sphère
  float b=dot(ro,rd), c=dot(ro,ro)-1., d=b*b-c;
  float tS=d>0.?-b-sqrt(d):1e9;
  // ── anneau
  float tR=1e9; vec3 pR;
  if(uRing>.5){
    float dn=dot(rd,nrm);
    if(abs(dn)>1e-4){ float t=-dot(ro,nrm)/dn; vec3 p=ro+rd*t; float r=length(p);
      if(t>0. && r>1.35 && r<2.35){ tR=t; pR=p; } }
  }
  // planète
  vec4 planet=vec4(0.);
  if(tS<1e8){
    vec3 p=ro+rd*tS, N=normalize(p);
    vec3 q=transpose3(tilt)*N;
    vec3 base=surface(q);
    float diff=max(dot(N,L),0.);
    float term=smoothstep(-.08,.35,dot(N,L));
    // ombre de l'anneau sur la planète
    float sh=1.;
    if(uRing>.5){ float dn=dot(L,nrm); if(abs(dn)>1e-4){ float t=-dot(p,nrm)/dn; vec3 s=p+L*t; float r=length(s);
      if(t>0. && r>1.35 && r<2.35) sh=.45; } }
    vec3 lit=base*(.06+1.15*diff*sh)*mix(vec3(1.),cSun,.35*term);
    float fres=pow(1.-max(dot(N,-rd),0.),3.);
    lit+=cRim*fres*(.35+.65*smoothstep(-.4,.4,dot(N,-L)*.5+.5))*.9;   // atmosphère, contre-jour violet
    lit+=cSun*fres*term*.25;
    planet=vec4(lit,1.);
  }
  vec4 ring=vec4(0.);
  if(tR<1e8){
    float r=length(pR);
    float k=(r-1.35)/1.;
    float bands=.55+.45*sin(k*48.+n(vec2(k*22.,0.))*5.);
    float a=smoothstep(0.,.06,k)*smoothstep(1.,.86,k)*(.35+.5*bands);
    a*= (k>.42&&k<.47)?.15:1.;                         // division de Cassini
    vec3 rc=mix(cMid,cHi,bands);
    // ombre de la planète sur l'anneau
    float bb=dot(pR,L), cc=dot(pR,pR)-1.; float sh=(bb*bb-cc>0. && -bb>0.)?.25:1.;
    rc*= (.3+.9*sh)*mix(vec3(1.),cSun,.25);
    ring=vec4(rc*a,a);
  }
  // composition dans l'ordre de profondeur (prémultiplié)
  if(tR<tS){ col=ring+planet*(1.-ring.a); } else { col=planet.a>0.?planet:ring; }
  gl_FragColor=col;
}`.replace("transpose3(tilt)", "mat3(tilt[0][0],tilt[1][0],tilt[2][0],tilt[0][1],tilt[1][1],tilt[2][1],tilt[0][2],tilt[1][2],tilt[2][2])");

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

// Palettes alignées sur les tokens brand/energy
const PALETTES = {
  violet: { deep: "#1A0B45", mid: "#5B2BC2", hi: "#C4B5FD", rim: "#8B5CF6", sun: "#FFD29A" },
  dusk:   { deep: "#140A33", mid: "#46239A", hi: "#A78BFA", rim: "#7C3AED", sun: "#FFC27A" },
};

export const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function PlanetGL({
  className, style,
  ring = false, tilt = -0.24, view = 0.16, scale = 0.9,
  period = 110, palette = "violet", texture,
  parallax = 10, scrollParallax = 0.06,
  fallback, onReady, label,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const fbRef = useRef(null);
  useEffect(() => {
    const wrap = wrapRef.current, cv = canvasRef.current;
    if (!wrap || !cv) return;
    const still = reducedMotion();
    let gl = null;
    try { gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true }); } catch { gl = null; }
    if (!gl) { cv.style.display = "none"; if (fbRef.current) fbRef.current.style.display = "block"; onReady?.(); return; }

    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) {
      console.warn("[PlanetGL]", e); cv.style.display = "none"; if (fbRef.current) fbRef.current.style.display = "block"; onReady?.(); return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (k) => gl.getUniformLocation(prog, k);
    const pal = PALETTES[palette] || PALETTES.violet;
    gl.uniform3fv(U("cDeep"), hex(pal.deep)); gl.uniform3fv(U("cMid"), hex(pal.mid)); gl.uniform3fv(U("cHi"), hex(pal.hi));
    gl.uniform3fv(U("cRim"), hex(pal.rim)); gl.uniform3fv(U("cSun"), hex(pal.sun));
    // soleil : en haut à droite, légèrement devant
    const l = [0.78, 0.52, -0.12], ln = Math.hypot(...l);
    gl.uniform3f(U("uLight"), l[0] / ln, l[1] / ln, l[2] / ln);
    gl.uniform1f(U("uTilt"), tilt); gl.uniform1f(U("uView"), view); gl.uniform1f(U("uRing"), ring ? 1 : 0);
    gl.uniform1f(U("uScale"), scale); gl.uniform1f(U("uHasTex"), 0);
    const uRes = U("uRes"), uRot = U("uRot");

    let alive = true, visible = false, raf = 0, drawn = false;
    const draw = (rot) => {
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uRot, rot);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!drawn) { drawn = true; wrap.classList.add("is-ready"); onReady?.(); }
    };

    if (texture) {
      const img = new Image(); img.crossOrigin = "anonymous"; img.decoding = "async";
      img.onload = () => {
        if (!alive) return;
        const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.uniform1i(U("uTex"), 0); gl.uniform1f(U("uHasTex"), 1);
        if (still) draw(0.9);
      };
      img.src = texture;
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(cv.clientWidth * dpr), hh = Math.round(cv.clientHeight * dpr);
      if (w && hh && (w !== cv.width || hh !== cv.height)) { cv.width = w; cv.height = hh; if (still || !visible) draw(0.9); }
    };
    const ro = new ResizeObserver(resize); ro.observe(cv); resize();

    // parallaxe : cible (souris + scroll) → position amortie
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const onMove = (e) => { target.x = (e.clientX / window.innerWidth - 0.5) * 2; target.y = (e.clientY / window.innerHeight - 0.5) * 2; };
    if (!still && parallax) window.addEventListener("pointermove", onMove, { passive: true });

    const t0 = performance.now();
    const loop = (now) => {
      if (!alive || !visible) { raf = 0; return; }
      const rot = 0.9 + ((now - t0) / 1000) * (Math.PI * 2 / period);
      draw(rot);
      cur.x += (target.x - cur.x) * 0.05; cur.y += (target.y - cur.y) * 0.05;
      const r = wrap.getBoundingClientRect();
      const sy = scrollParallax ? (r.top + r.height / 2 - window.innerHeight / 2) * -scrollParallax : 0;
      wrap.style.setProperty("--plx", `${(cur.x * parallax).toFixed(2)}px`);
      wrap.style.setProperty("--ply", `${(cur.y * parallax * 0.6 + sy).toFixed(2)}px`);
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && visible && !still && !document.hidden) raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (still) { if (visible && !drawn) draw(0.9); } else start(); }, { rootMargin: "100px" });
    io.observe(wrap);
    const onVis = () => start();
    document.addEventListener("visibilitychange", onVis);
    if (still) draw(0.9);

    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      window.removeEventListener("pointermove", onMove); document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ring, tilt, view, scale, period, palette, texture, parallax, scrollParallax]);

  return (
    <div ref={wrapRef} className={`planet-gl${className ? " " + className : ""}`} style={style} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <canvas ref={canvasRef}/>
      {fallback && <img ref={fbRef} className="planet-gl-fb" src={fallback} alt="" loading="lazy"/>}
    </div>
  );
}
