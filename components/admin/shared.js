import { useState, useCallback, useRef, useEffect } from "react";

// ── HOOKS ─────────────────────────────────────────────────────────────────────
export function useStorage(key, initial) {
  const [data, setData] = useState(initial);
  // useRef avoids stale closure — save() always sees latest data
  const dataRef = useRef(initial);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await window.storage.get(key);
        if (!cancelled && r) {
          const parsed = JSON.parse(r.value);
          dataRef.current = parsed;
          setData(parsed);
        }
      } catch {
        // storage unavailable — silently use initial value
      }
    })();
    return () => { cancelled = true; };
  }, [key]); // key only — stable

  const save = useCallback(async (updater) => {
    const next = typeof updater === "function" ? updater(dataRef.current) : updater;
    dataRef.current = next;
    setData(next);
    try { await window.storage.set(key, JSON.stringify(next)); } catch {}
  }, [key]); // key only — no stale closure

  return [data, save];
}


export const TAG_COLORS = ["#7C3AED","#4B7FFA","#8B5CF6","#06D6A0","#F59E0B","#EC4899","#F97316","#14B8A6","#EF4444","#84CC16"];

// ── BDD FIELD MAPPING ─────────────────────────────────────────────────────────
export const toApiProject = (p) => ({
  id: p.id, title: p.title, subtitle: p.subtitle, category: p.category,
  year: p.year, role: p.role, duration: p.duration, platform: p.platform,
  client: p.client, cover_type: p.coverType, context: p.context,
  problematique: p.problematique, objectifs: p.objectifs,
  process_steps: p.processSteps, metrics: p.metrics, tools: p.tools,
  plus_values: p.plusValues, featured: p.featured, confidential: p.confidential,
  display_order: p.order, tags: p.tags, images: p.images || [], cover_image: p.coverImage || null,
});
export const fromDbProject = (p) => ({
  ...p,
  coverType: p.cover_type ?? p.coverType ?? 'cabin',
  processSteps: p.process_steps ?? p.processSteps ?? [],
  plusValues: p.plus_values ?? p.plusValues ?? [],
  order: p.display_order ?? p.order ?? 99,
  images: p.images || [],
  coverImage: p.cover_image || p.coverImage || null,
});
export const toApiTestimonial = (t) => ({
  id: t.id, name: t.name, initials: t.init, role: t.role,
  company: t.company, company_logo: t.companyLogo, content: t.text,
  display_order: t.order, rating: t.rating ?? 5,
});
export const fromDbTestimonial = (t) => ({
  ...t,
  init: t.initials ?? t.init ?? '',
  text: t.content ?? t.text ?? '',
  companyLogo: t.company_logo ?? t.companyLogo ?? '',
  order: t.display_order ?? t.order ?? 99,
  rating: t.rating ?? 5,
});

export const DEFAULT_TAGS = [
  { id:"ios",name:"iOS",color:"#4B7FFA" },
  { id:"ux-research",name:"UX Research",color:"#4B7FFA"+"CC" },
  { id:"design-system",name:"Design System",color:"#06D6A0" },
  { id:"agile",name:"Agile",color:"#F59E0B" },
  { id:"web",name:"Web",color:"#38BDF8" },
  { id:"mobile",name:"Mobile",color:"#EC4899" },
  { id:"transport",name:"Transport",color:"#F97316" },
  { id:"b2e",name:"B2E",color:"#14B8A6" },
  { id:"ai",name:"IA / ML",color:"#A78BFA" },
  { id:"figma",name:"Figma",color:"#7C3AED" },
];

export const DEFAULT_PROJECTS = [
  { id:"cabin",title:"Cabin",order:1,featured:true,confidential:true,subtitle:"Refonte UX/UI — Application métier iOS",category:"Case Study",year:"2023",role:"Lead UX/UI Designer",duration:"8 mois",platform:"iOS / iPad",client:"Air France",tags:["ios","ux-research","design-system","agile","b2e"],coverType:"cabin",context:"Cabin est une application métier destinée au Personnel Navigant Commercial (PNC) d'Air France. Elle vise à dématérialiser les procédures et fiches papier utilisées par les équipages, en les accompagnant sur iPad avant, pendant et après chaque vol. Le projet s'inscrit dans la transformation digitale d'Air France et répond à une nécessité réglementaire et opérationnelle croissante.",problematique:"Comment moderniser les outils numériques du Personnel Navigant Commercial pour réduire la charge cognitive en vol, sans perturber les habitudes opérationnelles critiques ni compromettre les normes de sécurité aéronautique ?",objectifs:["Récolter les usages réels des PNC via interviews et ateliers de co-conception en environnement aéronautique","Définir des parcours utilisateurs optimisés pour chaque phase du vol (pré-vol, en vol, post-vol)","Instaurer les bonnes pratiques design et un design system au sein d'une équipe agile multi-sites","Concevoir un onboarding progressif pour faciliter l'adoption sur iPad par des profils non-techniques"],processSteps:[{num:"01",title:"Recherche & Discovery",desc:"Entretiens semi-directifs avec 18 PNC, observations in situ en cabine, ateliers de co-conception et shadowing lors de vols réels. Identification des pain points critiques et des besoins non exprimés.",tools:["Entretiens","Observation","Co-conception"]},{num:"02",title:"Analyse & Cadrage",desc:"Synthèse des insights en personas détaillés et cartographie des parcours utilisateurs par phase de vol. Priorisation des fonctionnalités via matrice impact/effort.",tools:["Personas","User Journey","MoSCoW"]},{num:"03",title:"Conception itérative",desc:"Wireframes basse fidélité, prototypes interactifs, design system Figma 120+ composants. Itérations hebdomadaires en Agile Scrum.",tools:["Figma","Design System","Prototype"]},{num:"04",title:"Validation & Déploiement",desc:"Tests d'utilisabilité avec les PNC testeurs, ajustements UX et roll-out. Programme d'onboarding structuré.",tools:["Tests utilisateurs","A/B Test","Formation"]}],metrics:[{value:"100%",label:"Procédures papier dématérialisées"},{value:"-35%",label:"Temps de traitement"},{value:"4.6/5",label:"Satisfaction utilisateur"}],tools:["Figma","Jira","Confluence","Teams"],plusValues:["Dématérialisation complète des procédures papier, réduction des erreurs","Interface intuitive adaptée aux contraintes aéronautiques","Design system cohérent et scalable pour les futures fonctionnalités","Conformité DGAC et satisfaction équipages améliorée"] },
  { id:"skylib",title:"Skylib",order:2,featured:false,confidential:false,subtitle:"Conception UX/UI — Plateforme de réservation premium",category:"UI Design",year:"2022",role:"UX/UI Designer",duration:"4 mois",platform:"Web / Responsive",client:"Projet école",tags:["web","ux-research","design-system","figma"],coverType:"skylib",context:"Skylib est un projet de conception d'une plateforme digitale de réservation de voyages haut de gamme. L'objectif était de repenser entièrement le parcours d'achat de billets d'avion en proposant une expérience premium, fluide et différenciante.",problematique:"Comment concevoir une plateforme de réservation qui transforme une expérience perçue comme stressante en un moment plaisant, tout en maintenant une efficacité maximale ?",objectifs:["Simplifier le parcours de réservation en 3 étapes clés","Créer une identité visuelle premium avec un design system scalable","Améliorer les taux de conversion sur les pages décisionnelles"],processSteps:[{num:"01",title:"Benchmark",desc:"Analyse de 12 plateformes concurrentes. Identification des patterns UX éprouvés et opportunités.",tools:["Benchmark","Heuristiques"]},{num:"02",title:"Research",desc:"Tests utilisateurs sur les parcours existants avec 8 participants. Définition de 3 personas.",tools:["Tests utilisateurs","Personas"]},{num:"03",title:"Design System",desc:"Création du design system avec 80+ composants, tokens et documentation complète.",tools:["Figma","Design tokens","Prototype HF"]}],metrics:[{value:"-40%",label:"Étapes pour réserver"},{value:"80+",label:"Composants DS"},{value:"+32pts",label:"Score NPS simulé"}],tools:["Figma","Notion","Maze","FigJam"],plusValues:["Parcours optimisé, 40% moins d'étapes vs concurrents","Design system 80+ composants documentés","Taux de succès tâches à 89% en test"] },
  { id:"ds-bluebird",title:"DS Blue Bird",order:3,featured:true,confidential:false,subtitle:"Identité & UX — Application véhicule électrique",category:"Case Study",year:"2023",role:"Product Designer",duration:"3 mois",platform:"iOS / Android",client:"DS Automobiles",tags:["mobile","ux-research","design-system"],coverType:"ds",context:"DS Automobiles souhaitait concevoir une application compagnon premium pour leur gamme électrique. L'ambition : créer une expérience digitale qui prolonge l'univers de marque DS — sophistication, avant-garde, sensorialité.",problematique:"Comment concevoir une application qui transcende la fonction utilitaire pour créer un lien émotionnel entre le conducteur et son véhicule ?",objectifs:["Créer une expérience premium cohérente avec le positionnement DS","Accès aux infos essentielles en moins de 2 taps","Micro-interactions valorisant la perception de qualité"],processSteps:[{num:"01",title:"Immersion marque",desc:"Atelier d'immersion DS : archives design, valeurs, codes visuels. Définition des principes UX directeurs.",tools:["Brand workshop","Moodboard"]},{num:"02",title:"Prototypage",desc:"Conception haute fidélité Figma. Prototypage micro-interactions et transitions Principle.",tools:["Figma","Principle","Zeplin"]},{num:"03",title:"Tests & Livraison",desc:"Tests utilisateurs avec 6 propriétaires DS. Itérations UX. Livraison specs développement.",tools:["Tests","Handoff"]}],metrics:[{value:"78%",label:"Adoption early adopters"},{value:"-65%",label:"Temps accès infos"},{value:"1er",label:"DS Innovation Award"}],tools:["Figma","Principle","Zeplin","Notion"],plusValues:["Interface primée DS Innovation Award","78% adoption early adopters dès le lancement","Réduction 65% temps accès infos critiques"] },
  { id:"sncf-connect",title:"SNCF Connect",order:4,featured:false,confidential:false,subtitle:"Compétition — Redesign UX/UI",category:"UX Audit",year:"2022",role:"UX Designer",duration:"6 semaines",platform:"iOS / Android",client:"SNCF × Digital Campus",tags:["mobile","ux-research","transport","figma"],coverType:"sncf",context:"Dans le cadre d'une compétition Digital Campus × SNCF, mon équipe a relevé le défi de repenser SNCF Connect pour accroître le trafic sur l'ensemble des services de transport au-delà du ferroviaire.",problematique:"Comment augmenter l'engagement sur les services SNCF alors que l'app est perçue comme centrée uniquement sur le train ?",objectifs:["Promouvoir les services transport alternatifs SNCF","Réduire la surcharge cognitive","Nouvelles fonctionnalités sans perturber les 17M d'utilisateurs"],processSteps:[{num:"01",title:"Audit heuristique",desc:"34 points de friction identifiés selon Nielsen. Analyse 15 000+ avis stores.",tools:["Audit","Heuristiques"]},{num:"02",title:"Design thinking",desc:"4 personas SNCF définis. Jobs-to-be-done, pain points, opportunités.",tools:["Personas","JTBD"]},{num:"03",title:"Prototype & Pitch",desc:"Écrans HF. Pitch final jury SNCF.",tools:["Figma","Pitch"]}],metrics:[{value:"34",label:"Frictions UX identifiées"},{value:"3",label:"Innovations proposées"},{value:"Top 3",label:"Classement compétition"}],tools:["Figma","FigJam","Teams","Notion"],plusValues:["Audit 34 frictions UX documentées","Intégration multimodale vélo/bus dans le parcours","Top 3 compétition"] },
  { id:"kara",title:"KARA",order:5,featured:true,confidential:false,subtitle:"0→1 — Assistant IA conversationnel RH",category:"Product Design",year:"2024",role:"Lead Product Designer",duration:"5 mois",platform:"Web App (SaaS)",client:"Startup KARA",tags:["web","ai","design-system","ux-research"],coverType:"kara",context:"Premier product designer de KARA, startup en lancement visant à automatiser les tâches RH répétitives via une interface IA conversationnelle. Ma mission couvrait tout : vision produit, identité visuelle, design system, livraison dev.",problematique:"Comment concevoir une interface IA conversationnelle RH perçue comme un assistant de confiance, dans un contexte où 73% des RH se méfient de l'IA pour son manque de transparence ?",objectifs:["Interface conversationnelle équilibrée entre guidage et liberté","Design system 0→1 scalable","Valider le concept avec de vrais RH avant développement"],processSteps:[{num:"01",title:"Discovery",desc:"12 entretiens RH. Cartographie processus, tâches chronophages, frustrations.",tools:["Entretiens","Journey map"]},{num:"02",title:"Stratégie produit",desc:"3 personas RH, JTBD, cadrage MVP, principes design : clarté, confiance, efficacité.",tools:["Personas","JTBD","Strategy"]},{num:"03",title:"Conception",desc:"Flux conversationnels, composants chat, états de loading et de confiance. Tests avec 5 utilisateurs.",tools:["Figma","Prototype","Tests"]},{num:"04",title:"Design System",desc:"120+ composants, design tokens, documentation Zeroheight pour les devs.",tools:["Figma","Tokens","Zeroheight"]}],metrics:[{value:"91%",label:"Taux complétion tâches"},{value:"120+",label:"Composants design system"},{value:"€800k",label:"Objectif levée de fonds"}],tools:["Figma","Notion","Loom","Zeroheight"],plusValues:["91% taux complétion en tests utilisateurs réels","120+ composants documentés, -30% temps développement","Concept validé avant dev, pitch investisseurs réussi"] },
];

export const DEFAULT_TESTIMONIALS = [
  { id:"t1",init:"FA",name:"Frédéric A.",role:"Responsable UX",company:"Air France",companyLogo:"",text:"Thomas est une personne compétente et appliquée. Des facultés importantes tant dans la maîtrise des outils d'ergonomie, les process de l'agilité. Il a aussi une casquette d'ancien développeur qui permet d'avoir une fluidité lors des échanges avec les équipes IT. Sa bonne humeur et son implication au sein de notre département ont été remarquées. Je ne doute pas que Thomas puisse procurer pour une future entreprise toute la satisfaction qu'il a pu nous apporter.",order:1 },
  { id:"t2",init:"BB",name:"Bahia B.",role:"Lead Designer",company:"Air France",companyLogo:"",text:"Je recommande vivement Thomas LELOUP pour tout poste lié à l'UX/UI. Au cours de sa période d'apprentissage chez Air France, il a démontré une grande maîtrise de Figma et une compréhension approfondie des principes de l'UX. Dans un contexte de projets menés en agilité, Thomas a su mettre en oeuvre ses capacités de collaboration avec les équipes métier et IT. Son enthousiasme et sa curiosité ont été un atout précieux pour notre équipe.",order:2 },
];

