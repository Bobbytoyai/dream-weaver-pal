import { useNavigate } from "react-router-dom";
import { Brain, Shield, Mic, Zap, Eye, Heart, Sparkles, ArrowLeft, MessageCircle, Cpu, Lock, Layers, Target, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ━━━ RETRO PRIMITIVES ━━━
const RetroSection = ({ children, bg = "var(--retro-blue)", className = "" }: { children: React.ReactNode; bg?: string; className?: string }) => (
  <section className={`border-4 border-black p-5 md:p-8 ${className}`}
    style={{ backgroundColor: bg, boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}>
    {children}
  </section>
);

const RetroTag = ({ children, bg = "var(--retro-yellow)" }: { children: React.ReactNode; bg?: string }) => (
  <span className="inline-block px-3 py-1 text-[10px] font-black uppercase border-2 border-black text-black"
    style={{ backgroundColor: bg }}>
    {children}
  </span>
);

// ━━━ ANIMATED NODE COMPONENT ━━━
function AnimatedNode({ icon: Icon, label, color, delay = 0, active = false }: {
  icon: React.ElementType; label: string; color: string; delay?: number; active?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={`border-3 border-black p-4 text-center transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${active ? "scale-105" : ""}`}
      style={{ borderWidth: "3px", backgroundColor: color, boxShadow: active ? "6px 6px 0px rgba(0,0,0,0.3)" : "3px 3px 0px rgba(0,0,0,0.15)" }}>
      <Icon className="w-6 h-6 text-black mx-auto mb-2" />
      <p className="text-xs font-black text-black">{label}</p>
    </div>
  );
}

// ━━━ ANIMATED PIPELINE ━━━
function PipelineDiagram() {
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(s => (s + 1) % 6);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { icon: Mic, label: "Entrée Vocale", desc: "Reconnaissance vocale + Normalisation 225+ règles", color: "var(--retro-blue)" },
    { icon: Shield, label: "Safety Pipeline", desc: "Filtrage critique AVANT tout traitement", color: "var(--retro-red)" },
    { icon: Brain, label: "Bobby Brain V9", desc: "Intent → KB → Gemini 3 Flash → Assemblage", color: "var(--retro-purple)" },
    { icon: Heart, label: "Emotion Engine", desc: "Theory of Mind + Relationship Engine", color: "var(--retro-green)" },
    { icon: Layers, label: "Response Assembly", desc: "Ouverture + Contenu + Fermeture", color: "var(--retro-yellow)" },
    { icon: Zap, label: "Voix ElevenLabs", desc: "Synthèse vocale enfant < 700ms", color: "var(--retro-blue)" },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="relative">
          <div className={`border-3 border-black p-4 flex items-center gap-4 transition-all duration-300 ${activeStep === i ? "scale-[1.02] translate-x-1" : ""}`}
            style={{ borderWidth: "3px", backgroundColor: step.color, boxShadow: activeStep === i ? "6px 6px 0px rgba(0,0,0,0.3)" : "3px 3px 0px rgba(0,0,0,0.15)" }}>
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-sm flex-shrink-0">
              {i + 1}
            </div>
            <step.icon className={`w-6 h-6 text-black flex-shrink-0 transition-transform duration-300 ${activeStep === i ? "scale-125" : ""}`} />
            <div>
              <p className="text-sm font-black text-black">{step.label}</p>
              <p className="text-xs font-black text-black">{step.desc}</p>
            </div>
            {activeStep === i && (
              <div className="ml-auto w-3 h-3 bg-black rounded-full animate-pulse" />
            )}
          </div>
          {i < steps.length - 1 && (
            <div className="flex justify-center py-1">
              <div className={`w-0.5 h-4 transition-colors duration-300 ${activeStep === i ? "bg-black" : "bg-black/30"}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ━━━ V8/V9 ENGINES GRID ━━━
function EnginesGrid() {
  const engines = [
    { icon: Eye, name: "Theory of Mind", desc: "Modélise l'état mental de l'enfant : croyances, attentes, niveau cognitif de Piaget. Adapte le langage (ex: '3 dodos' pour un enfant de 4 ans).", color: "var(--retro-purple)" },
    { icon: Heart, name: "Relationship Engine", desc: "4 phases relationnelles : Découverte → Confiance → Attachement → Complicité. Blagues internes et rappels de souvenirs.", color: "var(--retro-red)" },
    { icon: RefreshCw, name: "Variation Engine", desc: "Empêche Bobby de se répéter : analyse des 20 derniers tours, structure et vocabulaire variés systématiquement.", color: "var(--retro-green)" },
    { icon: Target, name: "Proactive Engine", desc: "Bobby initie spontanément des sujets, des faits ou des rappels de mémoire selon les centres d'intérêt détectés.", color: "var(--retro-blue)" },
    { icon: Sparkles, name: "Silence Engine", desc: "Détecte l'ennui, l'hésitation ou le désengagement. Relance intelligemment avec des activités adaptées.", color: "var(--retro-yellow)" },
    { icon: Cpu, name: "Master Control V9", desc: "Couche parentale : modes Nuit, École, Calme, Éducatif. Orchestre les packs de contenu et le fail-safe system.", color: "var(--retro-purple)" },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {engines.map((e, i) => (
        <AnimatedNode key={i} icon={e.icon} label={e.name} color={e.color} delay={i * 150} />
      ))}
    </div>
  );
}

// ━━━ ARCHITECTURE OVERVIEW ━━━
function ArchitectureDiagram() {
  const [activeLayer, setActiveLayer] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setActiveLayer(l => (l + 1) % 4), 3000);
    return () => clearInterval(interval);
  }, []);

  const layers = [
    { name: "Couche 1 — Sécurité", desc: "Safety Pipeline + Filtrage critique + Alertes parent temps réel", color: "var(--retro-red)", items: ["Filtrage IA", "RGPD/COPPA", "Sujets bloqués", "Alertes parent"] },
    { name: "Couche 2 — Compréhension", desc: "Normalisation vocale (225+ règles) + Intent Engine + Knowledge Base (4900+ entrées)", color: "var(--retro-blue)", items: ["STT Natif", "Normalizer", "Intent Engine", "KB Scoring"] },
    { name: "Couche 3 — Intelligence", desc: "Gemini 3 Flash + Local Brain fallback + Theory of Mind + Emotion Pipeline", color: "var(--retro-purple)", items: ["Gemini 3 Flash", "Local Brain", "Theory of Mind", "Emotions"] },
    { name: "Couche 4 — Expression", desc: "Response Assembly 3 phases + ElevenLabs TTS + Expression Engine holographique", color: "var(--retro-green)", items: ["Assembly V9", "ElevenLabs", "Hologramme 3D", "Lip Sync"] },
  ];

  return (
    <div className="space-y-4">
      {layers.map((layer, i) => (
        <div key={i}
          className={`border-3 border-black p-5 transition-all duration-500 ${activeLayer === i ? "scale-[1.01] translate-x-1" : ""}`}
          style={{ borderWidth: "3px", backgroundColor: layer.color, boxShadow: activeLayer === i ? "6px 6px 0px rgba(0,0,0,0.3)" : "3px 3px 0px rgba(0,0,0,0.15)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-black text-sm">{i + 1}</div>
            <h3 className="text-sm font-black text-black">{layer.name}</h3>
            {activeLayer === i && <div className="w-2 h-2 bg-black rounded-full animate-pulse ml-auto" />}
          </div>
          <p className="text-xs font-black text-black mb-3">{layer.desc}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {layer.items.map((item, j) => (
              <div key={j} className="bg-white/60 border-2 border-black px-2 py-1 text-center">
                <p className="text-[10px] font-black text-black">{item}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ━━━ MAIN PAGE ━━━
const Technologie = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b-4 border-black bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-black text-black hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" /> Bobby
          </button>
          <RetroTag bg="var(--retro-purple)">Technologie</RetroTag>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* HEADER */}
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-2 flex-wrap">
            <RetroTag bg="var(--retro-purple)">Bobby Brain V9</RetroTag>
            <RetroTag bg="var(--retro-green)">OSAI Technology</RetroTag>
            <RetroTag bg="var(--retro-red)">Exclusif Silverlit</RetroTag>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-black leading-tight">
            L'intelligence derrière
            <br />
            <span className="inline-block border-4 border-black px-3 py-1 mt-2" style={{ backgroundColor: "var(--retro-purple)" }}>
              Bobby Brain V9
            </span>
          </h1>
          <p className="text-sm font-black text-black max-w-2xl mx-auto">
            Technologie propriétaire développée par OSAI exclusivement pour Silverlit. 
            Architecture "Industrial Local-First" — 90-95% des interactions en local, latence &lt; 700ms.
          </p>
        </div>

        {/* ARCHITECTURE OVERVIEW */}
        <RetroSection bg="#fff">
          <h2 className="text-2xl font-black text-black text-center mb-6">🏗️ Architecture 4 Couches</h2>
          <p className="text-xs font-black text-black text-center mb-6">
            Chaque message traverse 4 couches de traitement en temps réel. L'animation montre le flux actif.
          </p>
          <ArchitectureDiagram />
        </RetroSection>

        {/* PIPELINE */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-black text-center">⚡ Pipeline de Décision</h2>
          <p className="text-xs font-black text-black text-center max-w-xl mx-auto">
            De la voix de l'enfant à la réponse de Bobby — chaque étape en moins de 700ms.
          </p>
          <div className="max-w-2xl mx-auto">
            <PipelineDiagram />
          </div>
        </div>

        {/* ENGINES */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-black text-center">🧠 Moteurs Cognitifs V8/V9</h2>
          <p className="text-xs font-black text-black text-center max-w-xl mx-auto">
            Six moteurs spécialisés travaillent en parallèle pour créer une interaction humaine et naturelle.
          </p>
          <EnginesGrid />
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {[
              { icon: Eye, name: "Theory of Mind", desc: "Modélise l'état mental de l'enfant : croyances, attentes, niveau cognitif de Piaget. Adapte le langage (ex: '3 dodos' pour un enfant de 4 ans).", color: "var(--retro-purple)" },
              { icon: Heart, name: "Relationship Engine", desc: "4 phases relationnelles : Découverte → Confiance → Attachement → Complicité. Crée des blagues internes et rappelle des souvenirs partagés.", color: "var(--retro-red)" },
              { icon: RefreshCw, name: "Variation Engine", desc: "Analyse les 20 derniers tours de conversation pour éviter toute répétition de structure, vocabulaire ou format de réponse.", color: "var(--retro-green)" },
              { icon: Target, name: "Proactive Engine", desc: "Bobby initie spontanément des sujets en se basant sur les 15 catégories d'intérêt trackées (Espace, Dinosaures, Animaux…).", color: "var(--retro-blue)" },
              { icon: Sparkles, name: "Silence & Attention Engine", desc: "Détecte l'ennui, l'hésitation ou le désengagement de l'enfant et relance avec des activités calibrées.", color: "var(--retro-yellow)" },
              { icon: Cpu, name: "Master Control V9", desc: "Couche de supervision parentale : modes Nuit, École, Calme, Éducatif. Orchestre les packs de contenu et active le fail-safe en cas critique.", color: "var(--retro-purple)" },
            ].map((engine, i) => (
              <RetroSection key={i} bg={engine.color}>
                <div className="flex items-start gap-3">
                  <engine.icon className="w-6 h-6 text-black flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-black text-black mb-1">{engine.name}</h3>
                    <p className="text-xs font-black text-black leading-relaxed">{engine.desc}</p>
                  </div>
                </div>
              </RetroSection>
            ))}
          </div>
        </div>

        {/* RESPONSE ASSEMBLY */}
        <RetroSection bg="var(--retro-yellow)">
          <h2 className="text-2xl font-black text-black text-center mb-6">💬 Assemblage de Réponse V9</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Ouverture", desc: "Empathie et validation émotionnelle. Bobby montre qu'il a compris ce que l'enfant ressent.", color: "var(--retro-green)" },
              { step: "2", title: "Contenu", desc: "Réponse cœur adaptée à l'âge, au sujet et au contexte. Enrichie par la Knowledge Base et la mémoire.", color: "var(--retro-blue)" },
              { step: "3", title: "Fermeture", desc: "Question ouverte, injection mémoire ou relance proactive. Maintient l'engagement naturellement.", color: "var(--retro-purple)" },
            ].map(s => (
              <div key={s.step} className="border-3 border-black p-5 text-center relative" style={{ borderWidth: "3px", backgroundColor: s.color }}>
                <div className="absolute -top-4 -left-2 w-8 h-8 bg-black text-white flex items-center justify-center font-black text-sm">{s.step}</div>
                <h3 className="text-sm font-black text-black mb-2 mt-2">{s.title}</h3>
                <p className="text-xs font-black text-black">{s.desc}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* SAFETY */}
        <RetroSection bg="var(--retro-red)">
          <h2 className="text-2xl font-black text-black text-center mb-4">🔒 OSAI Safety Cloud</h2>
          <p className="text-xs font-black text-black text-center mb-6">
            Framework de sécurité conforme RGPD, COPPA et UK Children's Code.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Safety First", desc: "Traitement AVANT toute logique" },
              { label: "Sujets bloqués", desc: "Configurables par les parents" },
              { label: "Alertes temps réel", desc: "Push notifications critiques" },
              { label: "Fail-Safe", desc: "Redirection adulte automatique" },
              { label: "Chiffrement E2E", desc: "Données cryptées en transit" },
              { label: "RGPD / COPPA", desc: "Conformité internationale" },
              { label: "Anti-echo", desc: "Filtrage sémantique intelligent" },
              { label: "Existentiel", desc: "Filtres mort/immortalité stricts" },
            ].map((item, i) => (
              <div key={i} className="bg-white/70 border-2 border-black p-3 text-center">
                <p className="text-[11px] font-black text-black">{item.label}</p>
                <p className="text-[9px] font-black text-black">{item.desc}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* PERFORMANCE METRICS */}
        <RetroSection bg="#fff">
          <h2 className="text-2xl font-black text-black text-center mb-6">📊 Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "< 700ms", label: "Latence totale", color: "var(--retro-green)" },
              { value: "4 900+", label: "Entrées KB", color: "var(--retro-blue)" },
              { value: "225+", label: "Règles normalisation", color: "var(--retro-yellow)" },
              { value: "50+", label: "Regex extraction", color: "var(--retro-purple)" },
              { value: "90-95%", label: "Traitement local", color: "var(--retro-red)" },
              { value: "15", label: "Catégories d'intérêt", color: "var(--retro-green)" },
              { value: "20", label: "Tours anti-répétition", color: "var(--retro-blue)" },
              { value: "3", label: "Phases assemblage", color: "var(--retro-yellow)" },
            ].map((m, i) => (
              <div key={i} className="border-3 border-black p-4 text-center" style={{ borderWidth: "3px", backgroundColor: m.color }}>
                <p className="text-2xl font-black text-black">{m.value}</p>
                <p className="text-[10px] font-black text-black uppercase">{m.label}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* OSAI / SILVERLIT */}
        <RetroSection bg="var(--retro-blue)">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-black text-black">🏭 Développé par OSAI pour Silverlit</h2>
            <p className="text-xs font-black text-black max-w-2xl mx-auto leading-relaxed">
              Bobby Brain Intelligence V9 est une technologie propriétaire développée par OSAI (Orange Agency) 
              exclusivement pour Silverlit. L'architecture "Industrial Local-First" est conçue pour une distribution 
              retail mondiale, avec un traitement local de 90-95% des interactions pour minimiser la latence et les coûts.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-4">
              <div className="bg-white/70 border-2 border-black p-3 text-center">
                <p className="text-lg font-black text-black">V9</p>
                <p className="text-[9px] font-black text-black">Version actuelle</p>
              </div>
              <div className="bg-white/70 border-2 border-black p-3 text-center">
                <p className="text-lg font-black text-black">OSAI</p>
                <p className="text-[9px] font-black text-black">Développeur</p>
              </div>
              <div className="bg-white/70 border-2 border-black p-3 text-center">
                <p className="text-lg font-black text-black">Silverlit</p>
                <p className="text-[9px] font-black text-black">Distributeur</p>
              </div>
            </div>
          </div>
        </RetroSection>
      </div>

      {/* FOOTER MINI */}
      <footer className="border-t-4 border-black bg-black text-white py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-black text-white">© 2026 Bobby — Technologie OSAI pour Silverlit — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
};

export default Technologie;
