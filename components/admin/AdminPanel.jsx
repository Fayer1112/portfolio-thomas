import { useState, useEffect, useCallback } from "react";
import {
  useStorage, toApiProject, fromDbProject, toApiTestimonial, fromDbTestimonial,
  TAG_COLORS, DEFAULT_TAGS, DEFAULT_PROJECTS, DEFAULT_TESTIMONIALS,
} from "./shared";

const TOAST_DURATION = 4000;

// Les PDFs Cloudinary doivent être servis via /raw/upload/ et non /image/upload/ (qui renvoie 401)
const fixPdfUrl = (url) => (url && url.includes('.pdf')) ? url.replace('/image/upload/', '/raw/upload/') : url;

function useToast() {
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_DURATION);
    return () => clearTimeout(t);
  }, [toast]);
  return [toast, notify];
}

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div key={toast.id} style={{
      position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:9999,
      padding:"12px 20px", borderRadius:10, display:"flex", alignItems:"center", gap:9,
      background: isError ? "rgba(239,68,68,.96)" : "rgba(6,214,160,.96)", color:"#fff",
      fontSize:13.5, fontWeight:600, fontFamily:"var(--fb)", boxShadow:"0 12px 32px rgba(0,0,0,.35)",
      maxWidth:"calc(100vw - 32px)",
    }}>
      <span>{isError ? "⚠️" : "✓"}</span>
      <span>{toast.message}</span>
    </div>
  );
}

// ── GRAPHE AIRE SVG ──────────────────────────────────────────────────────────
function AreaChart({ data, color = "#7C3AED", h = 110 }) {
  if (!data || data.length < 2) return <div style={{ height:h, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--tx3)", fontSize:12 }}>Pas assez de données</div>;
  const W = 300; const pad = 4;
  const maxV = Math.max(...data.map(d => d.v), 1);
  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: pad + (1 - d.v / maxV) * (h - pad * 2 - 20),
    v: d.v, l: d.l,
  }));
  const line = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`;
    const prev = pts[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) * 0.45;
    const cx2 = pt.x - (pt.x - prev.x) * 0.45;
    return `${acc} C${cx1},${prev.y} ${cx2},${pt.y} ${pt.x},${pt.y}`;
  }, "");
  const area = `${line} L${pts[pts.length-1].x},${h-20} L${pts[0].x},${h-20} Z`;
  const gid = `ag${color.replace(/[^a-z0-9]/gi,"")}`;
  const [hover, setHover] = useState(null);
  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width:"100%", height:h, overflow:"visible" }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".28"/>
          <stop offset="100%" stopColor={color} stopOpacity=".02"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((pt, i) => (
        <g key={i}>
          <circle cx={pt.x} cy={pt.y} r="3.5" fill="var(--bg2)" stroke={color} strokeWidth="1.5"/>
          <rect x={pt.x - W/(data.length*2)} y={0} width={W/data.length} height={h-20} fill="transparent"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}/>
          {hover === i && (
            <g>
              <rect x={Math.min(pt.x - 18, W - 40)} y={pt.y - 28} width={38} height={18} rx="4"
                fill="var(--bg3)" stroke={color} strokeWidth=".8" strokeOpacity=".5"/>
              <text x={Math.min(pt.x - 18, W - 40) + 19} y={pt.y - 15} fontSize="9" fill={color} textAnchor="middle" fontWeight="700">{pt.v}</text>
            </g>
          )}
        </g>
      ))}
      {/* X axis labels — show only first, middle, last */}
      {[0, Math.floor((data.length-1)/2), data.length-1].filter((v,i,a) => a.indexOf(v) === i).map(i => (
        <text key={i} x={pts[i].x} y={h - 5} fontSize="8" fill="var(--tx3)" textAnchor="middle">{pts[i].l}</text>
      ))}
    </svg>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
const PERIOD_CFG = {
  day:   { label:"24h",  sub:"Dernières 24 heures", unit:"heure" },
  week:  { label:"7j",   sub:"7 derniers jours",    unit:"jour" },
  month: { label:"30j",  sub:"30 derniers jours",   unit:"jour" },
  year:  { label:"1 an", sub:"12 derniers mois",    unit:"mois" },
};

function Trend({ pct }) {
  if (pct === null || pct === undefined) return null;
  const up = pct >= 0;
  return <span style={{ fontSize:11, fontWeight:700, color: up ? "#06D6A0" : "#f87171", marginLeft:5 }}>{up ? "↑" : "↓"}{Math.abs(pct)}%</span>;
}

function KpiCard({ label, value, sub, color, trend, hint }) {
  return (
    <div style={{ background:"var(--bg3)", border:"1px solid var(--bdr)", borderRadius:12, padding:"18px 20px" }}>
      <div style={{ fontSize:11, fontWeight:600, color:"var(--tx3)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>{label}</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
        <div style={{ fontFamily:"var(--fd)", fontSize:32, fontWeight:800, color, letterSpacing:"-1px", lineHeight:1 }}>{value}</div>
        {trend !== undefined && <Trend pct={trend}/>}
      </div>
      <div style={{ fontSize:11.5, color:"var(--tx3)", marginTop:6 }}>{sub}</div>
      {hint && <div style={{ fontSize:10.5, color:"var(--tx3)", marginTop:4, opacity:.7, fontStyle:"italic" }}>{hint}</div>}
    </div>
  );
}

function Dashboard({ token }) {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/analytics?period=${period}`, { headers: { Authorization:`Bearer ${token}` } })
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, period, tick]);

  const periodLabel = PERIOD_CFG[period]?.sub || "";

  const totals     = data?.totals || {};
  const visits     = data?.visits || [];
  const projViews  = data?.projectViews || [];
  const recent     = data?.recent || [];

  // Derived KPIs
  const visitors       = Number(totals.visitors) || 0;
  const projectViews   = Number(totals.project_views) || 0;
  const engagedSess    = Number(totals.engaged_sessions) || 0;
  const contacts       = Number(totals.contacts) || 0;
  const cvClicks       = Number(totals.cv_clicks) || 0;
  const prevVisitors   = Number(data?.prevTotals?.visitors) || 0;
  const trendPct       = prevVisitors > 0 ? Math.round((visitors - prevVisitors) / prevVisitors * 100) : null;
  const engagementRate = visitors > 0 ? Math.round(engagedSess / visitors * 100) : 0;
  const convRate       = visitors > 0 ? Math.round(contacts / visitors * 100) : 0;
  const avgProj        = visitors > 0 ? (projectViews / visitors).toFixed(1) : "0";
  const maxProj        = Math.max(...projViews.map(p => Number(p.count) || 0), 1);
  const noData         = !data || visitors === 0;

  const fmtTs = (ts) => {
    const d = new Date(ts);
    if (period === "year") return d.toLocaleDateString("fr-FR", { month:"short" });
    if (period === "day")  return `${String(d.getHours()).padStart(2,"0")}h`;
    return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit" });
  };
  const chartData = visits.map(v => ({ v: Number(v.count) || 0, l: fmtTs(v.ts) }));

  const timeAgo = (ts) => {
    const d = Date.now() - new Date(ts).getTime();
    if (d < 60000) return "À l'instant";
    if (d < 3600000) return `${Math.floor(d/60000)}min`;
    if (d < 86400000) return `${Math.floor(d/3600000)}h`;
    return `${Math.floor(d/86400000)}j`;
  };
  const evtLabel = (e) => {
    if (e.type === "project_view")      return `📁 Projet "${e.payload?.project || "?"}"`;
    if (e.type === "contact_form_send") return `✉️ Formulaire contact`;
    if (e.type === "contact_click")     return `👆 Clic ${e.payload?.label || "contact"}`;
    if (e.type === "cta_click")         return `🔗 CTA ${e.payload?.label || ""}`;
    if (e.type === "visit")             return `👁 Nouvelle visite`;
    return e.type;
  };
  const evtColor = (e) => e.type.includes("project") ? "#7C3AED" : e.type.includes("contact") ? "#06D6A0" : e.type === "cta_click" ? "#F59E0B" : "#4B7FFA";

  const periodBtnStyle = (p) => ({
    padding:"5px 13px", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer", border:"1px solid",
    borderColor: period === p ? "var(--acc)" : "var(--bdr)",
    background: period === p ? "var(--accd)" : "transparent",
    color: period === p ? "var(--acc)" : "var(--tx2)",
    fontFamily:"var(--fb)",
  });

  // Funnel steps
  const funnel = [
    { label:"Visiteurs",             val:visitors,     color:"#A78BFA" },
    { label:"Ont vu un projet",       val:engagedSess,  color:"#60A5FA" },
    { label:"Ont cliqué Mon CV",      val:cvClicks,     color:"#34D399" },
    { label:"Ont pris contact",       val:contacts,     color:"#FBBF24" },
  ];
  const funnelMax = Math.max(visitors, 1);

  return (
    <div>
      {/* Header */}
      <div className="ahd" style={{ marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div className="atit">Dashboard</div>
          <div className="asub">Analytiques anonymes CNIL · {periodLabel}</div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          {["day","week","month","year"].map(p => (
            <button key={p} style={periodBtnStyle(p)} onClick={() => setPeriod(p)}>{PERIOD_CFG[p].label}</button>
          ))}
          <button onClick={() => { setLoading(true); setTick(t => t+1); }}
            style={{ padding:"5px 11px", borderRadius:6, fontSize:12, background:"var(--bg3)", border:"1px solid var(--bdr)", color:"var(--tx2)", cursor:"pointer", fontFamily:"var(--fb)" }}>
            ↻
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:"center", color:"var(--tx3)" }}>⏳ Chargement…</div>
      ) : noData ? (
        <div style={{ background:"var(--bg3)", borderRadius:12, border:"1px solid var(--bdr)", padding:48, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
          <div style={{ fontFamily:"var(--fd)", fontSize:15, fontWeight:700, marginBottom:8 }}>Aucune donnée sur cette période</div>
          <div style={{ color:"var(--tx3)", fontSize:13 }}>Les visiteurs ayant accepté la mesure d'audience apparaîtront ici.</div>
        </div>
      ) : (<>
        {/* KPI Row 1 */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:16 }}>
          <KpiCard label="Visiteurs uniques" value={visitors} color="#A78BFA"
            sub={periodLabel} trend={trendPct}
            hint={trendPct !== null ? `vs période précédente` : undefined}/>
          <KpiCard label="Taux d'engagement" value={`${engagementRate}%`} color="#60A5FA"
            sub={`${engagedSess} ont ouvert un projet`}
            hint="Visiteurs qui consultent ton travail"/>
          <KpiCard label="Projets / visiteur" value={avgProj} color="#34D399"
            sub={`${projectViews} vues au total`}
            hint="Plus élevé = plus d'intérêt"/>
          <KpiCard label="Taux de contact" value={`${convRate}%`} color="#FBBF24"
            sub={`${contacts} message${contacts > 1 ? "s" : ""} reçu${contacts > 1 ? "s" : ""}`}
            hint="Objectif : > 2%"/>
          <KpiCard label="Clics Mon CV" value={cvClicks} color="#F472B6"
            sub="Téléchargements CV"
            hint="Intérêt recruteur direct"/>
        </div>

        {/* Visiteur trend chart */}
        <div style={{ background:"var(--bg3)", border:"1px solid var(--bdr)", borderRadius:12, padding:"20px 20px 12px", marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"var(--fd)" }}>
              Évolution visiteurs
              <span style={{ fontSize:11, color:"var(--tx3)", fontWeight:400, marginLeft:8 }}>par {PERIOD_CFG[period].unit}</span>
            </div>
            {trendPct !== null && (
              <div style={{ fontSize:12, color:"var(--tx3)" }}>
                vs période précédente : <Trend pct={trendPct}/>
              </div>
            )}
          </div>
          <AreaChart data={chartData} color="#7C3AED" h={120}/>
        </div>

        {/* Projects + Funnel */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          {/* Top Projects */}
          <div style={{ background:"var(--bg3)", border:"1px solid var(--bdr)", borderRadius:12, padding:"18px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"var(--fd)", marginBottom:14 }}>Projets les + consultés</div>
            {projViews.length === 0 ? <div style={{ color:"var(--tx3)", fontSize:12 }}>Aucun projet</div> :
              projViews.slice(0,6).map((p, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <span style={{ fontSize:10, fontWeight:800, color:"var(--tx3)", minWidth:14 }}>#{i+1}</span>
                  <span style={{ fontSize:12.5, fontWeight:600, flex:1, textTransform:"capitalize" }}>{p.project || "—"}</span>
                  <div style={{ flex:2, height:5, borderRadius:3, background:"rgba(124,58,237,.1)" }}>
                    <div style={{ height:"100%", borderRadius:3, background:"var(--acc)", width:`${(Number(p.count)/maxProj)*100}%`, transition:"width .6s ease" }}/>
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"var(--acc)", minWidth:22, textAlign:"right" }}>{p.count}</span>
                </div>
              ))
            }
          </div>

          {/* Conversion Funnel */}
          <div style={{ background:"var(--bg3)", border:"1px solid var(--bdr)", borderRadius:12, padding:"18px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"var(--fd)", marginBottom:14 }}>Funnel recruteur</div>
            <div style={{ fontSize:10, color:"var(--tx3)", marginBottom:14, lineHeight:1.5 }}>
              Suit le chemin d'un recruteur : visite → intérêt projet → CV → contact
            </div>
            {funnel.map((f, i) => (
              <div key={i} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:11.5, color:"var(--tx2)" }}>{f.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:f.color }}>{f.val}</span>
                </div>
                <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,.05)" }}>
                  <div style={{ height:"100%", borderRadius:3, background:f.color, width:`${(f.val/funnelMax)*100}%`, transition:"width .7s ease", opacity:.85 }}/>
                </div>
                {i < funnel.length - 1 && f.val > 0 && funnel[i+1].val > 0 && (
                  <div style={{ fontSize:9.5, color:"var(--tx3)", textAlign:"right", marginTop:2 }}>
                    → {Math.round(funnel[i+1].val/f.val*100)}% passent à l'étape suivante
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div style={{ background:"var(--bg3)", border:"1px solid var(--bdr)", borderRadius:12, padding:"18px 20px" }}>
          <div style={{ fontSize:13, fontWeight:700, fontFamily:"var(--fd)", marginBottom:14 }}>
            Activité récente
            <span style={{ fontSize:11, color:"var(--tx3)", fontWeight:400, marginLeft:8 }}>toutes périodes</span>
          </div>
          {recent.length === 0 ? <div style={{ color:"var(--tx3)", fontSize:12 }}>Aucune activité</div> :
            recent.slice(0,12).map((e, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:i<11?"1px solid rgba(255,255,255,.04)":"none" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:evtColor(e), flexShrink:0 }}/>
                <span style={{ fontSize:12.5, color:"var(--tx2)", flex:1 }}>{evtLabel(e)}</span>
                <span style={{ fontSize:11, color:"var(--tx3)", flexShrink:0 }}>{timeAgo(e.created_at)}</span>
              </div>
            ))
          }
        </div>
      </>)}
    </div>
  );
}

// ── IMAGE UPLOADER (Cloudinary) ───────────────────────────────────────────────
function ImageUploader({ value = [], onChange, maxFiles = 10, accept = "image/*", label = "Images", notify }) {
  const [uploading, setUploading] = useState(false);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "portfolio_uploads";

  const upload = async (files) => {
    if (!cloudName) { alert("Configure NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dans .env.local"); return; }
    setUploading(true);
    const urls = [];
    let hadError = false;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", preset);
      try {
        // Les PDFs doivent utiliser raw/upload — image/upload refuse de les servir (401)
        const resourceType = accept.includes("pdf") ? "raw" : "auto";
        const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method:"POST", body:fd });
        const d = await r.json();
        if (d.secure_url) urls.push(d.secure_url); else hadError = true;
      } catch(e) { console.error("Upload error", e); hadError = true; }
    }
    onChange([...value, ...urls].slice(0, maxFiles));
    setUploading(false);
    if (notify) {
      if (urls.length && !hadError) notify(`${urls.length} fichier${urls.length>1?"s":""} envoyé${urls.length>1?"s":""}`);
      else if (urls.length && hadError) notify("Upload partiellement réussi", "error");
      else notify("Échec de l'upload", "error");
    }
  };

  const remove = (idx) => onChange(value.filter((_,i)=>i!==idx));

  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:8 }}>
        {value.map((url,i) => (
          <div key={i} style={{ position:"relative", width:80, height:60, borderRadius:6, overflow:"hidden", border:"1px solid var(--bdr)" }}>
            {accept.includes("image") ? (
              <img src={url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/>
            ) : (
              <div style={{ width:"100%", height:"100%", background:"var(--bg3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>📄</div>
            )}
            <button onClick={()=>remove(i)} style={{ position:"absolute", top:2, right:2, background:"rgba(0,0,0,.7)", border:"none", borderRadius:"50%", width:18, height:18, color:"#fff", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>✕</button>
          </div>
        ))}
        {value.length < maxFiles && (
          <label style={{ width:80, height:60, borderRadius:6, border:"1px dashed var(--bdr)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--tx3)", fontSize:10, gap:3, transition:"border-color .2s" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--acc)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--bdr)"}>
            <span style={{ fontSize:20 }}>{uploading ? "⏳" : "+"}</span>
            <span>{uploading ? "Upload…" : label}</span>
            <input type="file" accept={accept} multiple={maxFiles>1} style={{ display:"none" }} onChange={e=>upload(e.target.files)} disabled={uploading}/>
          </label>
        )}
      </div>
      {!cloudName && (
        <div style={{ fontSize:11, color:"#f87171", padding:"6px 10px", background:"rgba(239,68,68,.08)", borderRadius:6, marginTop:4 }}>
          ⚠️ Configure ton cloud Cloudinary dans .env.local pour activer l'upload
        </div>
      )}
    </div>
  );
}

// ── ADMIN COMPONENTS ─────────────────────────────────────────────────────────
function AdminLogin({ onLogin, onBack }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!pw) return;
    setLoading(true); setErr("");
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (!r.ok) { setErr("Mot de passe incorrect."); return; }
      const { token } = await r.json();
      onLogin(token);
    } catch { setErr("Erreur de connexion."); }
    finally { setLoading(false); }
  };
  return (
    <div className="alog">
      <div className="alogb asc">
        <div style={{ textAlign:"center", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <div className="asbdot"/>
          <span style={{ fontFamily:"var(--fd)", fontSize:17, fontWeight:800 }}>Thomas Leloup</span>
        </div>
        <div className="alogh">Espace Admin</div>
        <div className="alogsub">Gestion du portfolio</div>
        <div className="afrm">
          <div className="fgrp">
            <label className="flbl">Mot de passe</label>
            <input className="finp" type="password" value={pw}
              onChange={(e) => { setPw(e.target.value); setErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••" autoFocus/>
            {err && <span className="ferr">{err}</span>}
          </div>
          <button className="btn-pri" onClick={submit} style={{ justifyContent:"center" }} disabled={loading}>{loading ? "Connexion…" : "Accéder →"}</button>
        </div>
        {onBack && (
          <button onClick={onBack} style={{ marginTop:16, width:"100%", background:"none", border:"none", color:"var(--tx3)", fontSize:12, cursor:"pointer", fontFamily:"var(--fb)", padding:"6px 0" }}>
            ← Retour au site
          </button>
        )}
      </div>
    </div>
  );
}

function ArrayField({ label, items, onChange, placeholder = "", multiline = false }) {
  const add = () => onChange([...items, multiline ? { num:`0${items.length+1}`, title:"", desc:"", tools:[] } : ""]);
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const update = (i, v) => { const a = [...items]; a[i] = v; onChange(a); };
  if (multiline) return (
    <div className="fgrp">
      <label className="flbl">{label}</label>
      {items.map((s, i) => (
        <div key={i} style={{ background:"var(--bg3)", border:"1px solid var(--bdr)", borderRadius:8, padding:12, marginBottom:9, position:"relative" }}>
          <button type="button" className="del-row-btn" style={{ position:"absolute", top:9, right:9, border:"none", padding:"1px 8px" }} onClick={() => remove(i)}>×</button>
          <div className="frow" style={{ marginBottom:8 }}>
            <div className="fgrp"><label className="flbl" style={{ fontSize:9.5 }}>N°</label><input className="finp" value={s.num||""} onChange={(e) => update(i,{...s,num:e.target.value})} style={{ fontSize:12 }}/></div>
            <div className="fgrp"><label className="flbl" style={{ fontSize:9.5 }}>Titre</label><input className="finp" value={s.title||""} onChange={(e) => update(i,{...s,title:e.target.value})}/></div>
          </div>
          <div className="fgrp"><label className="flbl" style={{ fontSize:9.5 }}>Description</label><textarea className="finp ftxa" style={{ minHeight:65 }} value={s.desc||""} onChange={(e) => update(i,{...s,desc:e.target.value})}/></div>
          <div className="fgrp"><label className="flbl" style={{ fontSize:9.5 }}>Méthodes (virgule)</label><input className="finp" value={(s.tools||[]).join(", ")} onChange={(e) => update(i,{...s,tools:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></div>
        </div>
      ))}
      <button type="button" className="add-row-btn" onClick={add}>+ Ajouter une étape</button>
    </div>
  );
  return (
    <div className="fgrp">
      <label className="flbl">{label}</label>
      {items.map((v, i) => (
        <div key={i} style={{ display:"flex", gap:7, marginBottom:7 }}>
          <input className="finp" value={v} onChange={(e) => update(i, e.target.value)} placeholder={`${placeholder} ${i+1}`} style={{ flex:1 }}/>
          <button type="button" className="del-row-btn" onClick={() => remove(i)}>×</button>
        </div>
      ))}
      <button type="button" className="add-row-btn" onClick={add}>+ Ajouter</button>
    </div>
  );
}

function MetricsField({ items, onChange }) {
  const add = () => onChange([...items, { value:"", label:"" }]);
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const update = (i, k, v) => { const a = [...items]; a[i] = { ...a[i], [k]:v }; onChange(a); };
  return (
    <div className="fgrp">
      <label className="flbl">Métriques clés</label>
      {items.map((m, i) => (
        <div key={i} style={{ display:"flex", gap:7, marginBottom:7 }}>
          <input className="finp" value={m.value} onChange={(e) => update(i,"value",e.target.value)} placeholder="91%" style={{ width:84, flex:"0 0 84px" }}/>
          <input className="finp" value={m.label} onChange={(e) => update(i,"label",e.target.value)} placeholder="Description" style={{ flex:1 }}/>
          <button type="button" className="del-row-btn" onClick={() => remove(i)}>×</button>
        </div>
      ))}
      <button type="button" className="add-row-btn" onClick={add}>+ Ajouter une métrique</button>
    </div>
  );
}

function ProjectModal({ project, tags, onSave, onClose, notify }) {
  const isEdit = !!project;
  const empty = { id:"", title:"", subtitle:"", category:"Case Study", year:new Date().getFullYear().toString(), role:"", duration:"", platform:"", client:"", tags:[], coverType:"cabin", coverImage:"", context:"", problematique:"", objectifs:[""], processSteps:[{num:"01",title:"",desc:"",tools:[]}], metrics:[{value:"",label:""}], tools:[""], plusValues:[""], images:[], featured:false, confidential:false, order:99 };
  const [f, setF] = useState(isEdit ? { ...project, processSteps:project.processSteps||[{num:"01",title:"",desc:"",tools:[]}], metrics:project.metrics||[{value:"",label:""}] } : empty);
  const [err, setErr] = useState({});
  const [tab, setTab] = useState("info");
  const set = (k, v) => setF((x) => ({ ...x, [k]:v }));
  const submit = () => {
    const e = {};
    if (!f.title.trim()) e.title = "Requis";
    if (!f.subtitle.trim()) e.subtitle = "Requis";
    if (!isEdit && !f.id.trim()) e.id = "Requis";
    if (Object.keys(e).length) { setErr(e); setTab("info"); return; }
    onSave({ ...f, id:f.id.trim().toLowerCase().replace(/\s+/g,"-"), objectifs:f.objectifs.filter(Boolean), tools:f.tools.filter(Boolean), plusValues:f.plusValues.filter(Boolean), processSteps:f.processSteps.filter(s=>s.title), metrics:f.metrics.filter(m=>m.value) });
  };
  const tabs = [["info","📋 Infos"],["content","📝 Contenu"],["process","⚙️ Processus"],["results","📊 Résultats"]];
  const tabSt = (id) => ({ padding:"5px 11px", borderRadius:6, fontSize:11.5, fontWeight:600, cursor:"pointer", border:"1px solid", borderColor:tab===id?"var(--acc)":"var(--bdr)", background:tab===id?"var(--accd)":"transparent", color:tab===id?"var(--acc)":"var(--tx2)", fontFamily:"var(--fb)" });
  return (
    <div className="movl" onClick={(e) => e.target===e.currentTarget&&onClose()}>
      <div className="mod">
        <div className="modt">{isEdit?`Modifier — ${project.title}`:"Nouveau projet"}</div>
        <div style={{ display:"flex", gap:6, marginBottom:20, borderBottom:"1px solid var(--bdr)", paddingBottom:14, flexWrap:"wrap" }}>
          {tabs.map(([id,lbl]) => <button key={id} type="button" style={tabSt(id)} onClick={() => setTab(id)}>{lbl}</button>)}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
          {tab==="info" && (<>
            <div className="frow">
              <div className="fgrp"><label className="flbl">Titre *</label><input className="finp" value={f.title} onChange={(e)=>{const t=e.target.value;set("title",t);if(!isEdit){const slug=t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");set("id",slug);}}}/>{err.title&&<span className="ferr">{err.title}</span>}</div>
              <div className="fgrp"><label className="flbl">Catégorie</label><select className="fslt" value={f.category} onChange={(e)=>set("category",e.target.value)}>{["Case Study","UI Design","UX Audit","Product Design","Branding"].map((c)=><option key={c}>{c}</option>)}</select></div>
            </div>
            {!isEdit && <div className="fgrp"><label className="flbl">ID slug <span style={{fontWeight:400,color:"var(--tx3)",fontSize:11}}>— auto-généré, modifiable</span></label><input className="finp" value={f.id} onChange={(e)=>set("id",e.target.value)} placeholder="ex: mon-projet"/>{err.id&&<span className="ferr">{err.id}</span>}</div>}
            <div className="fgrp"><label className="flbl">Sous-titre *</label><input className="finp" value={f.subtitle} onChange={(e)=>set("subtitle",e.target.value)}/>{err.subtitle&&<span className="ferr">{err.subtitle}</span>}</div>
            <div className="frow">
              <div className="fgrp"><label className="flbl">Rôle</label><input className="finp" value={f.role||""} onChange={(e)=>set("role",e.target.value)}/></div>
              <div className="fgrp"><label className="flbl">Client</label><input className="finp" value={f.client||""} onChange={(e)=>set("client",e.target.value)}/></div>
            </div>
            <div className="frow">
              <div className="fgrp"><label className="flbl">Durée</label><input className="finp" value={f.duration||""} onChange={(e)=>set("duration",e.target.value)}/></div>
              <div className="fgrp"><label className="flbl">Plateforme</label><input className="finp" value={f.platform||""} onChange={(e)=>set("platform",e.target.value)}/></div>
            </div>
            <div className="frow">
              <div className="fgrp"><label className="flbl">Année</label><input className="finp" value={f.year||""} onChange={(e)=>set("year",e.target.value)}/></div>
              <div className="fgrp"><label className="flbl">Cover SVG</label><select className="fslt" value={f.coverType} onChange={(e)=>set("coverType",e.target.value)}>{["cabin","skylib","ds","sncf","kara"].map((c)=><option key={c}>{c}</option>)}</select></div>
            </div>
            <div className="fgrp">
              <label className="flbl">Image de couverture <span style={{fontWeight:400,color:"var(--tx3)",fontSize:11}}>— remplace le SVG si uploadé</span></label>
              <ImageUploader value={f.coverImage?[f.coverImage]:[]} onChange={(v)=>set("coverImage",v[0]||"")} maxFiles={1} accept="image/*" label="Cover" notify={notify}/>
            </div>
            <div className="fgrp">
              <label className="flbl">Tags</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:5 }}>
                {tags.map((t) => { const sel=f.tags.includes(t.id); return <button key={t.id} type="button" style={{ padding:"4px 12px", borderRadius:5, fontSize:11.5, fontWeight:600, cursor:"pointer", border:"1px solid", borderColor:sel?t.color:"var(--bdr)", background:sel?t.color+"22":"transparent", color:sel?t.color:"var(--tx2)", fontFamily:"var(--fb)" }} onClick={()=>set("tags",sel?f.tags.filter((x)=>x!==t.id):[...f.tags,t.id])}>{t.name}</button>; })}
              </div>
            </div>
            <div className="frow">
              <label className="fchk"><input type="checkbox" checked={f.featured} onChange={(e)=>set("featured",e.target.checked)}/> En vedette</label>
              <label className="fchk"><input type="checkbox" checked={f.confidential} onChange={(e)=>set("confidential",e.target.checked)}/> 🔒 Confidentiel</label>
            </div>
            <div className="fgrp"><label className="flbl">Ordre</label><input className="finp" type="number" value={f.order} onChange={(e)=>set("order",parseInt(e.target.value)||99)} style={{ width:74 }}/></div>
          </>)}
          {tab==="content" && (<>
            <div className="fgrp"><label className="flbl">Contexte</label><textarea className="finp ftxa" style={{ minHeight:100 }} value={f.context} onChange={(e)=>set("context",e.target.value)}/></div>
            <div className="fgrp"><label className="flbl">Problématique</label><textarea className="finp ftxa" value={f.problematique} onChange={(e)=>set("problematique",e.target.value)}/></div>
            <ArrayField label="Objectifs" items={f.objectifs} onChange={(v)=>set("objectifs",v)} placeholder="Objectif"/>
            <ArrayField label="Outils" items={f.tools} onChange={(v)=>set("tools",v)} placeholder="Outil"/>
          </>)}
          {tab==="process" && <ArrayField label="Étapes du processus" items={f.processSteps} onChange={(v)=>set("processSteps",v)} multiline={true}/>}
          {tab==="results" && (<>
            <MetricsField items={f.metrics} onChange={(v)=>set("metrics",v)}/>
            <ArrayField label="Plus-values" items={f.plusValues} onChange={(v)=>set("plusValues",v)} placeholder="Plus-value"/>
            <div className="fgrp">
              <label className="flbl">Photos du projet <span style={{fontWeight:400,color:"var(--tx3)",fontSize:11}}>— upload direct (PNG, JPG)</span></label>
              <ImageUploader value={f.images||[]} onChange={(v)=>set("images",v)} maxFiles={12} accept="image/*" label="Photo" notify={notify}/>
            </div>
          </>)}
        </div>
        <div className="modft"><button className="btn-sec" onClick={onClose}>Annuler</button><button className="btn-pri" onClick={submit}>{isEdit?"Enregistrer":"Créer"}</button></div>
      </div>
    </div>
  );
}

function TagModal({ onSave, onClose }) {
  const [name, setName] = useState(""); const [color, setColor] = useState(TAG_COLORS[0]); const [err, setErr] = useState("");
  return (
    <div className="movl" onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div className="mod" style={{ maxWidth:420 }}>
        <div className="modt">Nouveau tag</div>
        <div className="mods">Créez un tag pour catégoriser vos projets</div>
        <div className="fgrp"><label className="flbl">Nom *</label><input className="finp" value={name} onChange={(e)=>setName(e.target.value)} autoFocus/>{err&&<span className="ferr">{err}</span>}</div>
        <div className="fgrp" style={{ marginTop:12 }}>
          <label className="flbl">Couleur</label>
          <div className="cpick">{TAG_COLORS.map((c)=><div key={c} className={`cpc${color===c?" sel":""}`} style={{ background:c }} onClick={()=>setColor(c)}/>)}</div>
        </div>
        <div style={{ marginTop:12, display:"inline-flex", alignItems:"center", gap:8, padding:"6px 14px", borderRadius:5, background:color+"1A", border:`1px solid ${color}33` }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:color }}/><span style={{ fontSize:12.5, fontWeight:600, color }}>{name||"Aperçu"}</span>
        </div>
        <div className="modft"><button className="btn-sec" onClick={onClose}>Annuler</button><button className="btn-pri" onClick={()=>{ if(!name.trim()){setErr("Requis");return;} onSave({id:name.trim().toLowerCase().replace(/\s+/g,"-"),name:name.trim(),color}); }}>Créer</button></div>
      </div>
    </div>
  );
}

function TestimonialModal({ testimonial, onSave, onClose }) {
  const isEdit = !!testimonial;
  const empty = { id:"", name:"", init:"", role:"", company:"", companyLogo:"", text:"", order:99 };
  const [f, setF] = useState(isEdit ? { ...testimonial } : empty);
  const [err, setErr] = useState({});
  const set = (k, v) => setF((x) => ({ ...x, [k]:v }));
  const submit = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Requis";
    if (!f.text.trim()) e.text = "Requis";
    if (!isEdit && !f.id.trim()) e.id = "Requis";
    if (Object.keys(e).length) { setErr(e); return; }
    const init = f.init.trim() || f.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
    onSave({ ...f, id:f.id.trim().toLowerCase().replace(/\s+/g,"-"), init });
  };
  return (
    <div className="movl" onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div className="mod" style={{ maxWidth:580 }}>
        <div className="modt">{isEdit?`Modifier — ${testimonial.name}`:"Nouveau témoignage"}</div>
        <div className="mods">Les témoignages s'affichent dans la section Recommandations</div>
        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
          <div className="frow">
            <div className="fgrp"><label className="flbl">Nom complet *</label><input className="finp" value={f.name} onChange={(e)=>{const n=e.target.value;set("name",n);if(!isEdit){const slug=n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");set("id",slug);}}}/>{err.name&&<span className="ferr">{err.name}</span>}</div>
            <div className="fgrp"><label className="flbl">Initiales (auto si vide)</label><input className="finp" value={f.init} onChange={(e)=>set("init",e.target.value)} placeholder="JD"/></div>
          </div>
          {!isEdit && <div className="fgrp"><label className="flbl">ID slug <span style={{fontWeight:400,color:"var(--tx3)",fontSize:11}}>— auto-généré, modifiable</span></label><input className="finp" value={f.id} onChange={(e)=>set("id",e.target.value)} placeholder="ex: jean-dupont"/>{err.id&&<span className="ferr">{err.id}</span>}</div>}
          <div className="frow">
            <div className="fgrp"><label className="flbl">Rôle / Poste</label><input className="finp" value={f.role||""} onChange={(e)=>set("role",e.target.value)} placeholder="Lead Designer"/></div>
            <div className="fgrp"><label className="flbl">Entreprise</label><input className="finp" value={f.company||""} onChange={(e)=>set("company",e.target.value)} placeholder="Air France"/></div>
          </div>
          <div className="fgrp">
            <label className="flbl">Logo entreprise (URL image)</label>
            <input className="finp" value={f.companyLogo||""} onChange={(e)=>set("companyLogo",e.target.value)} placeholder="https://... (PNG/SVG transparent recommandé)"/>
            <span style={{ fontSize:10.5, color:"var(--tx3)", marginTop:4 }}>Laissez vide pour afficher le nom en texte. Préférez un logo blanc ou transparent.</span>
          </div>
          <div className="fgrp">
            <label className="flbl">Témoignage *</label>
            <textarea className="finp ftxa" style={{ minHeight:120 }} value={f.text} onChange={(e)=>set("text",e.target.value)}/>
            {err.text && <span className="ferr">{err.text}</span>}
            <span style={{ fontSize:10.5, color:"var(--tx3)", marginTop:3 }}>{f.text.length} caractères</span>
          </div>
          <div className="frow">
            <div className="fgrp"><label className="flbl">Ordre d'affichage (1 = premier et mis en vedette)</label><input className="finp" type="number" min="1" value={f.order} onChange={(e)=>set("order",parseInt(e.target.value)||99)} style={{ width:80 }}/></div>
            <div className="fgrp"><label className="flbl">Note (étoiles)</label><div style={{ display:"flex", gap:6, marginTop:6 }}>{[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>set("rating",n)} style={{ fontSize:22, background:"none", border:"none", cursor:"pointer", color:n<=(f.rating??5)?"#F59E0B":"var(--bdr2)", padding:0, lineHeight:1 }}>★</button>)}</div></div>
          </div>
          {f.name && (
            <div style={{ background:"var(--bg3)", border:"1px solid var(--bdr)", borderRadius:10, padding:"18px 20px" }}>
              <div style={{ fontSize:9.5, color:"var(--tx3)", fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:10 }}>Aperçu</div>
              <div style={{ fontSize:38, color:"var(--acc)", fontFamily:"Georgia,serif", lineHeight:1, marginBottom:10, opacity:.9 }}>"</div>
              <p style={{ fontSize:13, color:"var(--tx2)", lineHeight:1.75, marginBottom:14 }}>{f.text||"Le témoignage apparaîtra ici..."}</p>
              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:"var(--accd)", border:"1px solid rgba(124,58,237,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--fd)", fontWeight:800, fontSize:12, color:"var(--acc)" }}>
                  {f.init||(f.name?f.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2):"?")}
                </div>
                <div>
                  <div style={{ fontFamily:"var(--fd)", fontSize:13, fontWeight:700 }}>{f.name}</div>
                  <div style={{ display:"flex", gap:6, marginTop:2 }}>
                    {f.role&&<span style={{ fontSize:11, color:"var(--tx2)" }}>{f.role}</span>}
                    {f.company&&<span style={{ background:"rgba(124,58,237,.08)", border:"1px solid rgba(124,58,237,.2)", borderRadius:4, padding:"1px 7px", fontSize:10.5, fontWeight:600, color:"var(--acc)" }}>{f.company}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modft"><button className="btn-sec" onClick={onClose}>Annuler</button><button className="btn-pri" onClick={submit}>{isEdit?"Enregistrer":"Ajouter"}</button></div>
      </div>
    </div>
  );
}

// ── ADMIN PAGE ────────────────────────────────────────────────────────────────
export default function AdminPage({ onBack }) {
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem("tl_admin_session") === "1"; } catch { return false; }
  });
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem("tl_admin_token") || ""; } catch { return ""; }
  });
  const [tab, setTab] = useState("dashboard");
  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [tags, setTags] = useStorage("tl_v4_tags", DEFAULT_TAGS);
  const [testimonials, setTestimonials] = useState(DEFAULT_TESTIMONIALS);
  const [editProject, setEditProject] = useState(null);
  const [addProject, setAddProject] = useState(false);
  const [addTag, setAddTag] = useState(false);
  const [editTesti, setEditTesti] = useState(null);
  const [addTesti, setAddTesti] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [confirmTesti, setConfirmTesti] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [cvUrl, setCvUrl] = useState("");
  const [cvSaving, setCvSaving] = useState(false);
  const [toast, notify] = useToast();

  useEffect(() => {
    if (!authed) return;
    Promise.all([
      fetch('/api/projects').then(r=>r.json()).catch(()=>null),
      fetch('/api/testimonials').then(r=>r.json()).catch(()=>null),
      fetch('/api/settings').then(r=>r.json()).catch(()=>null),
    ]).then(([projs, testis, settings]) => {
      if (Array.isArray(projs)) setProjects(projs.map(fromDbProject));
      if (Array.isArray(testis)) setTestimonials(testis.map(fromDbTestimonial));
      if (settings?.cv_url) setCvUrl(fixPdfUrl(settings.cv_url));
      setLoadingData(false);
    });
  }, [authed]);

  const saveCv = async (url) => {
    setCvSaving(true);
    try {
      const r = await fetch('/api/settings', { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` }, body:JSON.stringify({ key:'cv_url', value:url }) });
      notify(r.ok ? (url ? "CV mis à jour" : "CV retiré") : "Erreur lors de l'enregistrement du CV", r.ok ? "success" : "error");
    } catch(e) { console.error(e); notify("Erreur lors de l'enregistrement du CV", "error"); }
    setCvUrl(url);
    setCvSaving(false);
  };

  if (!authed) return <AdminLogin onBack={onBack} onLogin={(tok) => {
    try { sessionStorage.setItem("tl_admin_session", "1"); sessionStorage.setItem("tl_admin_token", tok); } catch {}
    setToken(tok); setAuthed(true);
  }}/>;

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const saveProject = async (p) => {
    const isEdit = !!editProject;
    let ok = true;
    try {
      const url = isEdit ? `/api/projects/${p.id}` : '/api/projects';
      const r = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: authHeaders, body: JSON.stringify(toApiProject(p)) });
      if (!r.ok) { ok = false; console.error('Erreur API projet', r.status); }
    } catch(e) { ok = false; console.error(e); }
    notify(ok ? (isEdit ? "Projet mis à jour" : "Projet créé") : "Erreur lors de l'enregistrement du projet", ok ? "success" : "error");
    refreshData();
    setEditProject(null); setAddProject(false);
  };
  const refreshData = () => {
    Promise.all([
      fetch('/api/projects').then(r=>r.json()).catch(()=>null),
      fetch('/api/testimonials').then(r=>r.json()).catch(()=>null),
    ]).then(([projs, testis]) => {
      if (Array.isArray(projs)) setProjects(projs.map(fromDbProject));
      if (Array.isArray(testis)) setTestimonials(testis.map(fromDbTestimonial));
    });
  };

  const sorted = [...projects].sort((a,b)=>(a.order||99)-(b.order||99));

  return (
    <div className="aly">
      <div className="asb">
        <div className="asblo"><div className="asbdot"/>Admin</div>
        {[["dashboard","📊","Dashboard"],["projects","📁","Projets"],["testimonials","💬","Avis"],["tags","🏷️","Tags"],["cv","📄","Mon CV"]].map(([id,ico,lbl]) => (
          <button key={id} className={`ani${tab===id?" on":""}`} onClick={()=>setTab(id)}><span>{ico}</span>{lbl}</button>
        ))}
        <div className="asbbt">
          <button className="ani" onClick={() => {
            try { sessionStorage.removeItem("tl_admin_session"); sessionStorage.removeItem("tl_admin_token"); } catch {}
            setToken(""); setAuthed(false);
          }} style={{ color:"#f87171", marginBottom:4 }}>🔒 Déconnexion</button>
          <button className="ani" onClick={onBack} style={{ color:"var(--tx3)" }}>← Retour au site</button>
        </div>
      </div>
      <div className="ama">
        {tab==="dashboard" && <Dashboard token={token}/>}

        {tab==="projects" && (<>
          <div className="ahd"><div><div className="atit">Projets</div><div className="asub">{projects.length} projet{projects.length>1?"s":""}</div></div><button className="btn-pri" onClick={()=>setAddProject(true)}>+ Nouveau projet</button></div>
          <table className="atbl">
            <thead><tr><th>Projet</th><th>Catégorie</th><th>Tags</th><th>Options</th><th>Actions</th></tr></thead>
            <tbody>{sorted.map((p) => (
              <tr key={p.id}>
                <td><div style={{ fontFamily:"var(--fd)", fontWeight:700, letterSpacing:"-.3px" }}>{p.title}</div><div style={{ fontSize:11.5, color:"var(--tx3)", marginTop:2 }}>{p.year} · {p.client||"—"}</div></td>
                <td><span style={{ fontSize:12, color:"var(--tx2)" }}>{p.category}</span></td>
                <td><div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>{p.tags?.slice(0,3).map((tid)=>{const t=tags.find((x)=>x.id===tid);return t?<span key={tid} style={{ padding:"2px 7px", borderRadius:4, fontSize:10.5, background:t.color+"1A", color:t.color, fontWeight:600 }}>{t.name}</span>:null;})} {p.tags?.length>3&&<span style={{ fontSize:10.5, color:"var(--tx3)" }}>+{p.tags.length-3}</span>}</div></td>
                <td><div style={{ display:"flex", gap:4 }}>{p.featured&&<span className="abadge abfeat">Vedette</span>}{p.confidential&&<span className="abadge abconf">🔒</span>}</div></td>
                <td><div className="aacts"><button className="absm abed" onClick={()=>setEditProject(p)}>Modifier</button><button className="absm abdl" onClick={()=>setConfirm(p.id)}>Supprimer</button></div></td>
              </tr>
            ))}</tbody>
          </table>
          {projects.length===0&&<div className="aempty">Aucun projet.</div>}
        </>)}

        {tab==="testimonials" && (<>
          <div className="ahd"><div><div className="atit">Avis &amp; Témoignages</div><div className="asub">{testimonials.length} témoignage{testimonials.length>1?"s":""} — Le 1er est affiché en vedette</div></div><button className="btn-pri" onClick={()=>setAddTesti(true)}>+ Nouveau témoignage</button></div>
          <table className="atbl">
            <thead><tr><th>Auteur</th><th>Entreprise</th><th>Logo</th><th>Extrait</th><th>Ordre</th><th>Actions</th></tr></thead>
            <tbody>{[...testimonials].sort((a,b)=>(a.order||99)-(b.order||99)).map((t) => (
              <tr key={t.id}>
                <td><div style={{ display:"flex", alignItems:"center", gap:9 }}><div style={{ width:32, height:32, borderRadius:"50%", background:"var(--accd)", border:"1px solid rgba(124,58,237,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--fd)", fontWeight:800, fontSize:12, color:"var(--acc)", flexShrink:0 }}>{t.init}</div><div><div style={{ fontWeight:700, fontFamily:"var(--fd)", letterSpacing:"-.2px" }}>{t.name}</div>{t.role&&<div style={{ fontSize:11, color:"var(--tx3)", marginTop:1 }}>{t.role}</div>}</div></div></td>
                <td><span style={{ background:"rgba(124,58,237,.08)", border:"1px solid rgba(124,58,237,.15)", borderRadius:4, padding:"2px 8px", fontSize:10.5, fontWeight:600, color:"var(--acc)" }}>{t.company||"—"}</span></td>
                <td>{t.companyLogo?<img src={t.companyLogo} style={{ height:18, opacity:.6, filter:"brightness(0) invert(.6)" }} alt=""/>:<span style={{ fontSize:11, color:"var(--tx3)" }}>—</span>}</td>
                <td><span style={{ fontSize:12, color:"var(--tx2)" }}>{t.text?.slice(0,55)}…</span></td>
                <td><span style={{ fontFamily:"var(--fd)", fontSize:14, fontWeight:700, color:"var(--acc)" }}>{t.order}</span></td>
                <td><div className="aacts"><button className="absm abed" onClick={()=>setEditTesti(t)}>Modifier</button><button className="absm abdl" onClick={()=>setConfirmTesti(t.id)}>Supprimer</button></div></td>
              </tr>
            ))}</tbody>
          </table>
          {testimonials.length===0&&<div className="aempty">Aucun témoignage.</div>}
        </>)}

        {tab==="tags" && (<>
          <div className="ahd"><div><div className="atit">Tags</div><div className="asub">{tags.length} tag{tags.length>1?"s":""}</div></div><button className="btn-pri" onClick={()=>setAddTag(true)}>+ Nouveau tag</button></div>
          <div className="tgmgrid">{tags.map((t)=><div className="tgmitem" key={t.id}><div className="tgmdot" style={{ background:t.color }}/><span style={{ fontWeight:600 }}>{t.name}</span><button className="tgmdel" onClick={()=>{setTags((ts)=>ts.filter((x)=>x.id!==t.id)); notify("Tag supprimé");}}>×</button></div>)}</div>
          {tags.length===0&&<div className="aempty">Aucun tag.</div>}
          <div className="tusage" style={{ marginTop:24 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12, fontFamily:"var(--fd)" }}>Utilisation des tags</div>
            {tags.map((t)=>{ const count=projects.filter((p)=>p.tags?.includes(t.id)).length; return <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}><div style={{ width:7, height:7, borderRadius:"50%", background:t.color, flexShrink:0 }}/><span style={{ fontSize:12.5, color:"var(--tx2)", flex:1, fontWeight:500 }}>{t.name}</span><div style={{ height:4, borderRadius:2, background:t.color+"22", flex:2 }}><div style={{ height:"100%", borderRadius:2, background:t.color, width:`${Math.min(100,(count/Math.max(1,projects.length))*100)}%`, transition:"width .5s" }}/></div><span style={{ fontSize:11, color:"var(--tx3)", minWidth:52, textAlign:"right" }}>{count} projet{count>1?"s":""}</span></div>; })}
          </div>
        </>)}

        {tab==="cv" && (<>
          <div className="ahd"><div><div className="atit">Mon CV</div><div className="asub">Gérez le PDF affiché sur votre portfolio</div></div></div>
          <div style={{ maxWidth:560 }}>
            <div style={{ background:"var(--bg3)", border:"1px solid var(--bdr)", borderRadius:12, padding:"24px 28px", marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--tx2)", marginBottom:16 }}>CV actuel</div>
              {cvUrl ? (
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"rgba(6,214,160,.08)", border:"1px solid rgba(6,214,160,.2)", borderRadius:9, marginBottom:16 }}>
                  <span style={{ fontSize:24 }}>📄</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#06D6A0" }}>CV en ligne</div>
                    <a href={cvUrl} target="_blank" rel="noopener" style={{ fontSize:11.5, color:"var(--tx3)", wordBreak:"break-all" }}>{cvUrl.slice(0,60)}…</a>
                  </div>
                  <button onClick={()=>saveCv("")} style={{ padding:"6px 14px", borderRadius:7, background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", color:"#f87171", fontSize:12, fontWeight:600, cursor:"pointer" }}>Retirer</button>
                </div>
              ) : (
                <div style={{ padding:"12px 16px", background:"rgba(255,255,255,.03)", border:"1px dashed var(--bdr)", borderRadius:9, marginBottom:16, fontSize:13, color:"var(--tx3)" }}>
                  Aucun CV configuré
                </div>
              )}
              <div style={{ fontSize:13, fontWeight:600, color:"var(--tx2)", marginBottom:10 }}>Uploader un nouveau PDF</div>
              <ImageUploader value={cvUrl ? [cvUrl] : []} onChange={(urls)=>saveCv(urls[urls.length-1]||"")} maxFiles={1} accept="application/pdf,.pdf" label="PDF" notify={notify}/>
              {cvSaving && <div style={{ marginTop:8, fontSize:12, color:"var(--tx3)" }}>Sauvegarde…</div>}
            </div>
            <div style={{ fontSize:12, color:"var(--tx3)", lineHeight:1.6 }}>
              Le PDF uploadé sera utilisé pour tous les boutons <strong>"Mon CV"</strong> du portfolio.
            </div>
          </div>
        </>)}
      </div>

      {(editProject||addProject) && <ProjectModal project={editProject} tags={tags} onSave={saveProject} onClose={()=>{setEditProject(null);setAddProject(false);}} notify={notify}/>}
      {addTag && <TagModal onSave={(t)=>{setTags((ts)=>ts.find((x)=>x.id===t.id)?ts:[...ts,t]);setAddTag(false); notify("Tag créé");}} onClose={()=>setAddTag(false)}/>}
      {(editTesti||addTesti) && <TestimonialModal testimonial={editTesti} onSave={async (t)=>{
        let ok = true;
        try {
          const r = await fetch('/api/testimonials', { method:'POST', headers:authHeaders, body:JSON.stringify(toApiTestimonial(t)) });
          if (!r.ok) { ok = false; console.error('Erreur API témoignage', r.status); }
        } catch(e) { ok = false; console.error(e); }
        notify(ok ? (editTesti ? "Témoignage mis à jour" : "Témoignage ajouté") : "Erreur lors de l'enregistrement du témoignage", ok ? "success" : "error");
        refreshData();
        setEditTesti(null); setAddTesti(false);
      }} onClose={()=>{setEditTesti(null);setAddTesti(false);}}/>}
      {confirm && <div className="movl" onClick={()=>setConfirm(null)}><div className="mod" style={{ maxWidth:400 }} onClick={(e)=>e.stopPropagation()}><div className="modt">Supprimer ce projet ?</div><div className="mods">Cette action est irréversible.</div><div className="modft"><button className="btn-sec" onClick={()=>setConfirm(null)}>Annuler</button><button className="btn-pri" style={{ background:"#ef4444" }} onClick={async ()=>{
        try { await fetch(`/api/projects/${confirm}`, { method:'DELETE', headers:authHeaders }); notify("Projet supprimé"); } catch(e) { console.error(e); notify("Erreur lors de la suppression", "error"); }
        refreshData(); setConfirm(null);
      }}>Supprimer</button></div></div></div>}
      {confirmTesti && <div className="movl" onClick={()=>setConfirmTesti(null)}><div className="mod" style={{ maxWidth:400 }} onClick={(e)=>e.stopPropagation()}><div className="modt">Supprimer ce témoignage ?</div><div className="mods">Cette action est irréversible.</div><div className="modft"><button className="btn-sec" onClick={()=>setConfirmTesti(null)}>Annuler</button><button className="btn-pri" style={{ background:"#ef4444" }} onClick={async ()=>{
        try { await fetch('/api/testimonials', { method:'DELETE', headers:authHeaders, body:JSON.stringify({ id:confirmTesti }) }); notify("Témoignage supprimé"); } catch(e) { console.error(e); notify("Erreur lors de la suppression", "error"); }
        refreshData(); setConfirmTesti(null);
      }}>Supprimer</button></div></div></div>}
      <Toast toast={toast}/>
    </div>
  );
}

