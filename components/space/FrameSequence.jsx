"use client";
import React, { useCallback, useEffect, useImperativeHandle, useRef } from "react";

// Séquence d'images rendue dans Blender (public/3d/...), dessinée sur un canvas.
// Le parent pilote la frame affichée via ref.setProgress(0→1). Chargement progressif :
// une frame sur 16, puis 8, 4, 2, 1 — on affiche toujours la frame chargée la plus proche,
// donc le scroll reste fluide même sur une connexion mobile lente.
const FrameSequence = React.forwardRef(function FrameSequence({ dir, count, className, fit = "cover", lazyMargin = "200% 0px", blend = false }, ref) {
  const canvasRef = useRef(null);
  const st = useRef(null);
  if (!st.current) st.current = { imgs: new Array(count), want: 0, wantF: 0, drawn: -1, raf: 0 };
  const src = (i) => `${dir}/f_${String(i + 1).padStart(4, "0")}.webp`;
  const draw = useCallback(() => {
    const s = st.current, c = canvasRef.current;
    if (!c || !c.width) return;
    const ok = (k) => { const im = s.imgs[k]; return k >= 0 && k < count && im && im.complete && im.naturalWidth > 0; };
    const base = Math.floor(s.wantF), frac = s.wantF - base;
    // fondu entre deux images voisines si elles sont chargées : mouvement continu quel que soit le nombre d'images
    let a = -1, b = -1, mix = 0;
    if (blend && frac > 0.02 && ok(base) && ok(base + 1)) { a = base; b = base + 1; mix = frac; }
    else {
      const w = Math.round(s.wantF);
      for (let d = 0; d < count && a < 0; d++) { if (ok(w - d)) a = w - d; else if (ok(w + d)) a = w + d; }
    }
    if (a < 0) return;
    const key = a + mix.toFixed(2) * 1 + (b < 0 ? 0 : 0.001);
    if (key === s.drawn) return;
    s.drawn = key;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    const put = (img) => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const k = fit === "cover" ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
      const dw = iw * k, dh = ih * k;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    };
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1; put(s.imgs[a]);
    if (b >= 0) { ctx.globalAlpha = mix; put(s.imgs[b]); ctx.globalAlpha = 1; }
  }, [count, fit, blend]);
  useImperativeHandle(ref, () => ({
    setProgress(p) {
      const s = st.current;
      const f = Math.min(1, Math.max(0, p)) * (count - 1);
      if (f === s.wantF) return;
      s.wantF = f; s.want = Math.round(f);
      if (!s.raf) s.raf = requestAnimationFrame(() => { s.raf = 0; draw(); });
    },
  }), [count, draw]);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const s = st.current;
    let alive = true, started = false;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
      if (w && h && (w !== c.width || h !== c.height)) { c.width = w; c.height = h; s.drawn = -1; draw(); }
    };
    const start = () => {
      if (started) return; started = true;
      const order = [], seen = new Set();
      for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
      if (!seen.has(count - 1)) order.splice(1, 0, count - 1);
      let next = 0;
      const pump = () => {
        if (!alive || next >= order.length) return;
        const i = order[next++];
        const im = new Image();
        im.decoding = "async";
        im.onload = im.onerror = () => { if (!alive) return; if (Math.abs(i - s.want) <= Math.abs(s.drawn - s.want) || s.drawn < 0) { s.drawn = -1; draw(); } pump(); };
        im.src = src(i);
        s.imgs[i] = im;
      };
      for (let k = 0; k < 6; k++) pump(); // 6 téléchargements en parallèle
    };
    const ro = new ResizeObserver(resize); ro.observe(c); resize();
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { start(); io.disconnect(); } }, { rootMargin: lazyMargin });
    io.observe(c);
    return () => { alive = false; ro.disconnect(); io.disconnect(); cancelAnimationFrame(s.raf); s.raf = 0; };
  }, [count, dir, draw, lazyMargin]);
  return <div className={className}><canvas ref={canvasRef}/></div>;
});

export default FrameSequence;
