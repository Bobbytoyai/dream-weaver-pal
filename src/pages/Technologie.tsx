import { useNavigate } from "react-router-dom";
import { Brain, Shield, Mic, Zap, Eye, Heart, Sparkles, ArrowLeft, MessageCircle, Cpu, Lock, Layers, Target, RefreshCw, TrendingUp, DollarSign, Users, BarChart } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

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

// ━━━ ANIMATED BRAIN TREE ━━━
// Central brain node with branches connecting to each cognitive module
function BrainTreeDiagram() {
  const [activeNode, setActiveNode] = useState(0);
  const [pulsePhase, setPulsePhase] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const nodes = [
    { id: "core", x: 50, y: 18, label: "OSAI NeuralCore™", icon: "🧠", color: "#C084FC", desc: "Moteur LLM propriétaire multi-couches avec raisonnement adaptatif enfant" },
    { id: "safety", x: 15, y: 40, label: "SafeGuard™", icon: "🛡️", color: "#FCA5A5", desc: "Pipeline de sécurité pré-traitement avec détection sémantique temps réel" },
    { id: "voice", x: 85, y: 40, label: "VoiceLab™", icon: "🎤", color: "#93C5FD", desc: "Synthèse vocale neurale avec prosodie émotionnelle et lip-sync visémique" },
    { id: "emotion", x: 8, y: 65, label: "EmotiSense™", icon: "💜", color: "#F0ABFC", desc: "Détection émotionnelle multi-signal avec modèle Theory of Mind enfant" },
    { id: "memory", x: 35, y: 70, label: "MemoryGraph™", icon: "🔗", color: "#86EFAC", desc: "Mémoire persistante à graphe relationnel — faits, préférences, contexte" },
    { id: "intent", x: 65, y: 70, label: "IntentNet™", icon: "🎯", color: "#FDE68A", desc: "Classification d'intention 50+ catégories avec scoring composite hybride" },
    { id: "kb", x: 92, y: 65, label: "KnowledgeBase™", icon: "📚", color: "#67E8F9", desc: "4900+ entrées validées avec recherche sémantique et scoring contextuel" },
    { id: "proactive", x: 20, y: 92, label: "ProActive™", icon: "⚡", color: "#FDBA74", desc: "Moteur d'initiative spontanée basé sur 15 catégories d'intérêt trackées" },
    { id: "variation", x: 50, y: 95, label: "VariaGen™", icon: "🔄", color: "#A5B4FC", desc: "Anti-répétition sur 20 tours — structure, vocabulaire et format variés" },
    { id: "assembly", x: 80, y: 92, label: "ResponseForge™", icon: "⚙️", color: "#6EE7B7", desc: "Assemblage 3 phases : Empathie → Contenu → Relance proactive" },
  ];

  // Connections from core to all children
  const connections = [
    [0, 1], [0, 2], // core → safety, voice
    [1, 3], [1, 4], // safety → emotion, memory
    [2, 5], [2, 6], // voice → intent, kb
    [3, 7], [4, 7], // emotion, memory → proactive
    [5, 8], [6, 9], // intent → variation, kb → assembly
    [7, 8], [8, 9], // proactive → variation → assembly
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode(n => (n + 1) % nodes.length);
      setPulsePhase(p => p + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Draw connections on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, w, h);

    connections.forEach(([from, to]) => {
      const a = nodes[from];
      const b = nodes[to];
      const x1 = (a.x / 100) * w;
      const y1 = (a.y / 100) * h;
      const x2 = (b.x / 100) * w;
      const y2 = (b.y / 100) * h;

      const isActive = from === activeNode || to === activeNode;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      // Curved line
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2 - 10;
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.strokeStyle = isActive ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.15)";
      ctx.lineWidth = isActive ? 2.5 : 1.2;
      ctx.setLineDash(isActive ? [] : [4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Animated dot on active connection
      if (isActive) {
        const t = (Date.now() % 1500) / 1500;
        const dotX = x1 + (x2 - x1) * t;
        const dotY = y1 + (y2 - y1) * t;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
        ctx.fillStyle = nodes[activeNode].color;
        ctx.fill();
      }
    });
  }, [activeNode, pulsePhase]);

  return (
    <div className="relative w-full" style={{ minHeight: "620px" }}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />
      {nodes.map((node, i) => (
        <div
          key={node.id}
          className={`absolute cursor-pointer transition-all duration-500 ${activeNode === i ? "scale-110 z-20" : "z-10"}`}
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: `translate(-50%, -50%) ${activeNode === i ? "scale(1.1)" : "scale(1)"}`,
          }}
          onClick={() => setActiveNode(i)}
        >
          <div
            className={`border-3 border-black p-2 md:p-3 text-center transition-all duration-300 ${activeNode === i ? "shadow-lg" : ""}`}
            style={{
              borderWidth: "3px",
              backgroundColor: node.color,
              boxShadow: activeNode === i
                ? `0 0 20px ${node.color}80, 6px 6px 0px rgba(0,0,0,0.3)`
                : "3px 3px 0px rgba(0,0,0,0.15)",
              minWidth: i === 0 ? "140px" : "100px",
            }}
          >
            <span className={`block ${i === 0 ? "text-2xl" : "text-lg"} mb-0.5`}>{node.icon}</span>
            <p className={`${i === 0 ? "text-[11px]" : "text-[9px]"} font-black text-black leading-tight`}>{node.label}</p>
          </div>
        </div>
      ))}

      {/* Active node description */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <div className="border-3 border-black p-4 bg-white text-center transition-all duration-300" style={{ borderWidth: "3px", boxShadow: "4px 4px 0px rgba(0,0,0,0.2)" }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-lg">{nodes[activeNode].icon}</span>
            <span className="text-sm font-black text-black">{nodes[activeNode].label}</span>
          </div>
          <p className="text-xs font-black text-black">{nodes[activeNode].desc}</p>
        </div>
      </div>
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
    { icon: Mic, label: "OSAI SpeechNet™", desc: "Capture vocale native + Normalisation 225+ règles phonétiques", color: "#93C5FD" },
    { icon: Shield, label: "OSAI SafeGuard™", desc: "Filtrage sémantique critique AVANT tout traitement cognitif", color: "#FCA5A5" },
    { icon: Brain, label: "OSAI NeuralCore™", desc: "LLM propriétaire multi-couches → Intent → KB → Assemblage", color: "#C084FC" },
    { icon: Heart, label: "OSAI EmotiSense™", desc: "Theory of Mind + Relationship Engine + Prosodie adaptative", color: "#F0ABFC" },
    { icon: Layers, label: "OSAI ResponseForge™", desc: "Assemblage 3 phases : Empathie → Contenu → Relance", color: "#86EFAC" },
    { icon: Zap, label: "OSAI VoiceLab™", desc: "Synthèse vocale neurale propriétaire < 700ms end-to-end", color: "#FDE68A" },
  ];

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="relative">
          <div className={`border-3 border-black p-3 md:p-4 flex items-center gap-3 md:gap-4 transition-all duration-300 ${activeStep === i ? "scale-[1.02] translate-x-1" : ""}`}
            style={{
              borderWidth: "3px",
              backgroundColor: step.color,
              boxShadow: activeStep === i ? `0 0 15px ${step.color}80, 6px 6px 0px rgba(0,0,0,0.3)` : "3px 3px 0px rgba(0,0,0,0.15)",
            }}>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-black text-white flex items-center justify-center font-black text-sm flex-shrink-0">
              {i + 1}
            </div>
            <step.icon className={`w-5 h-5 md:w-6 md:h-6 text-black flex-shrink-0 transition-transform duration-300 ${activeStep === i ? "scale-125" : ""}`} />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-black text-black">{step.label}</p>
              <p className="text-[10px] md:text-xs font-black text-black">{step.desc}</p>
            </div>
            {activeStep === i && <div className="ml-auto w-3 h-3 bg-black rounded-full animate-pulse flex-shrink-0" />}
          </div>
          {i < steps.length - 1 && (
            <div className="flex justify-center py-0.5">
              <div className={`w-0.5 h-3 transition-colors duration-300 ${activeStep === i ? "bg-black" : "bg-black/20"}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ━━━ ARCHITECTURE LAYERS ━━━
function ArchitectureDiagram() {
  const [activeLayer, setActiveLayer] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setActiveLayer(l => (l + 1) % 4), 3000);
    return () => clearInterval(interval);
  }, []);

  const layers = [
    { name: "Couche 1 — OSAI SafeGuard™", desc: "Pipeline sécurité pré-traitement + Détection sémantique + Alertes parent temps réel", color: "#FCA5A5",
      items: ["Filtrage NLP", "RGPD/COPPA", "Sujets bloqués", "Alertes push"] },
    { name: "Couche 2 — OSAI SpeechNet™", desc: "Normalisation vocale propriétaire (225+ règles phonétiques) + IntentNet™ + KnowledgeBase™", color: "#93C5FD",
      items: ["STT Natif", "Normalizer", "IntentNet™", "KB Scoring"] },
    { name: "Couche 3 — OSAI NeuralCore™", desc: "LLM multi-couches propriétaire + EmotiSense™ + MemoryGraph™ + Theory of Mind", color: "#C084FC",
      items: ["NeuralCore™", "Local Brain", "Theory of Mind", "EmotiSense™"] },
    { name: "Couche 4 — OSAI ResponseForge™", desc: "Assemblage 3 phases + VoiceLab™ Neural TTS + Expression Engine holographique", color: "#86EFAC",
      items: ["ResponseForge™", "VoiceLab™", "Hologramme 3D", "Lip Sync"] },
  ];

  return (
    <div className="space-y-3">
      {layers.map((layer, i) => (
        <div key={i}
          className={`border-3 border-black p-4 md:p-5 transition-all duration-500 cursor-pointer ${activeLayer === i ? "scale-[1.01] translate-x-1" : ""}`}
          style={{
            borderWidth: "3px",
            backgroundColor: layer.color,
            boxShadow: activeLayer === i ? `0 0 15px ${layer.color}80, 6px 6px 0px rgba(0,0,0,0.3)` : "3px 3px 0px rgba(0,0,0,0.15)",
          }}
          onClick={() => setActiveLayer(i)}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-black text-sm">{i + 1}</div>
            <h3 className="text-xs md:text-sm font-black text-black">{layer.name}</h3>
            {activeLayer === i && <div className="w-2 h-2 bg-black rounded-full animate-pulse ml-auto" />}
          </div>
          <p className="text-[10px] md:text-xs font-black text-black mb-2">{layer.desc}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {layer.items.map((item, j) => (
              <div key={j} className="bg-white/70 border-2 border-black px-2 py-1 text-center">
                <p className="text-[9px] md:text-[10px] font-black text-black">{item}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ━━━ CLOUD BUSINESS PLAN ━━━
function CloudBusinessPlan() {
  // Real cost analysis
  // LLM (Gemini Flash): ~$0.10/1M input tokens, ~$0.40/1M output tokens
  // Average session: ~2000 input tokens, ~500 output tokens = ~$0.0004/session
  // ~30 sessions/month per user = $0.012/month LLM
  // TTS (ElevenLabs): ~$0.30/1000 chars, avg 100 chars/response, 30 sessions × 5 responses = 15000 chars = $4.50
  // BUT with caching ~60% hit rate = $1.80/month TTS
  // Supabase: ~$0.00/user (free tier covers most)
  // Total estimated: ~$1.10/user/month (dominated by TTS)

  const costs = [
    { label: "OSAI NeuralCore™ (LLM)", cost: "0.02€", detail: "~30 sessions × 2500 tokens/session", color: "#C084FC" },
    { label: "OSAI VoiceLab™ (TTS)", cost: "0.85€", detail: "~15 000 chars/mois, cache 60%", color: "#93C5FD" },
    { label: "Infrastructure Cloud", cost: "0.08€", detail: "Base de données, stockage, CDN", color: "#86EFAC" },
    { label: "OSAI SafeGuard™", cost: "0.05€", detail: "Filtrage sécurité, alertes, logs", color: "#FCA5A5" },
    { label: "Analyse IA Sessions", cost: "0.10€", detail: "Résumé, émotions, centres d'intérêt", color: "#FDE68A" },
    { label: "Total coût/utilisateur", cost: "1.10€", detail: "Par mois, usage moyen", color: "#F0ABFC" },
  ];

  const plans = [
    {
      name: "Gratuit", price: "0€", color: "#86EFAC", margin: "-1.10€",
      marginColor: "#FCA5A5", marginLabel: "Coût d'acquisition",
      features: ["5 min/jour", "Voix basique", "3 histoires/jour"],
      strategy: "Conversion vers Bobby+",
    },
    {
      name: "Bobby+", price: "9.99€", color: "#93C5FD", margin: "+8.89€",
      marginColor: "#86EFAC", marginLabel: "Marge/utilisateur",
      features: ["Conversation illimitée", "Toutes les voix OSAI", "Bobby Store complet", "Dashboard parent", "MemoryGraph™ Cloud"],
      strategy: "Cœur de revenus — 80% des users",
    },
    {
      name: "Bobby Pro", price: "19.99€", color: "#C084FC", margin: "+18.89€",
      marginColor: "#86EFAC", marginLabel: "Marge/utilisateur",
      features: ["Tout Bobby+", "Multi-enfants (x3)", "Analyse IA avancée", "Alertes prioritaires", "Support dédié 24h"],
      strategy: "Premium — familles nombreuses",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Cost Breakdown */}
      <div>
        <h3 className="text-lg font-black text-black text-center mb-4">💰 Coût réel par utilisateur</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {costs.map((c, i) => (
            <div key={i} className="border-3 border-black p-3 text-center" style={{ borderWidth: "3px", backgroundColor: c.color, boxShadow: "3px 3px 0px rgba(0,0,0,0.15)" }}>
              <p className="text-xl font-black text-black">{c.cost}</p>
              <p className="text-[10px] font-black text-black">{c.label}</p>
              <p className="text-[8px] font-black text-black mt-1">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Plans */}
      <div>
        <h3 className="text-lg font-black text-black text-center mb-4">📊 Modèle de revenus</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <div key={i} className="border-4 border-black" style={{ boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}>
              <div className="p-4 text-center" style={{ backgroundColor: plan.color }}>
                <p className="text-sm font-black text-black uppercase">{plan.name}</p>
                <p className="text-3xl font-black text-black">{plan.price}<span className="text-xs">/mois</span></p>
              </div>
              <div className="p-3 text-center" style={{ backgroundColor: plan.marginColor }}>
                <p className="text-lg font-black text-black">{plan.margin}</p>
                <p className="text-[9px] font-black text-black">{plan.marginLabel}</p>
              </div>
              <div className="p-3 bg-white">
                <ul className="space-y-1.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="text-[10px] font-black text-black flex items-start gap-1.5">
                      <span>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 pt-2 border-t-2 border-black/10">
                  <p className="text-[9px] font-black text-black italic">{plan.strategy}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Projections */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "100 users", revenue: "899€/mois", profit: "789€", color: "#FDE68A" },
          { label: "1 000 users", revenue: "8 990€/mois", profit: "7 890€", color: "#86EFAC" },
          { label: "10 000 users", revenue: "89 900€/mois", profit: "78 900€", color: "#93C5FD" },
          { label: "100 000 users", revenue: "899K€/mois", profit: "789K€", color: "#C084FC" },
        ].map((p, i) => (
          <div key={i} className="border-3 border-black p-3 text-center" style={{ borderWidth: "3px", backgroundColor: p.color, boxShadow: "3px 3px 0px rgba(0,0,0,0.15)" }}>
            <p className="text-xs font-black text-black">{p.label}</p>
            <p className="text-lg font-black text-black">{p.revenue}</p>
            <p className="text-[9px] font-black text-black">Profit net: {p.profit}</p>
          </div>
        ))}
      </div>
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
          <RetroTag bg="#C084FC">OSAI Technology</RetroTag>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* HEADER */}
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-2 flex-wrap">
            <RetroTag bg="#C084FC">Bobby Brain V9</RetroTag>
            <RetroTag bg="#86EFAC">OSAI Technology</RetroTag>
            <RetroTag bg="#FCA5A5">Exclusif Silverlit</RetroTag>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-black leading-tight">
            L'intelligence derrière
            <br />
            <span className="inline-block border-4 border-black px-3 py-1 mt-2" style={{ backgroundColor: "#C084FC" }}>
              Bobby Brain V9
            </span>
          </h1>
          <p className="text-sm font-black text-black max-w-2xl mx-auto">
            Stack technologique propriétaire développée par OSAI exclusivement pour Silverlit. 
            Architecture "Industrial Local-First" — NeuralCore™ LLM, VoiceLab™ Neural TTS, SafeGuard™ NLP Security.
          </p>
        </div>

        {/* BRAIN TREE DIAGRAM */}
        <RetroSection bg="#FFF5E6" className="relative overflow-hidden">
          <h2 className="text-xl md:text-2xl font-black text-black text-center mb-2">🧠 OSAI Bobby Brain V9 — Architecture Cognitive</h2>
          <p className="text-[10px] font-black text-black text-center mb-6">
            Cliquez sur chaque nœud pour explorer les modules cognitifs. Les connexions s'animent en temps réel.
          </p>
          <BrainTreeDiagram />
        </RetroSection>

        {/* ARCHITECTURE OVERVIEW */}
        <RetroSection bg="#fff">
          <h2 className="text-xl md:text-2xl font-black text-black text-center mb-4">🏗️ Architecture 4 Couches OSAI</h2>
          <p className="text-[10px] font-black text-black text-center mb-4">
            Chaque message traverse 4 couches de traitement propriétaires en temps réel.
          </p>
          <ArchitectureDiagram />
        </RetroSection>

        {/* PIPELINE */}
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-black text-black text-center">⚡ Pipeline de Décision OSAI</h2>
          <p className="text-[10px] font-black text-black text-center max-w-xl mx-auto">
            De la voix de l'enfant à la réponse de Bobby — 6 étapes propriétaires en moins de 700ms.
          </p>
          <div className="max-w-2xl mx-auto">
            <PipelineDiagram />
          </div>
        </div>

        {/* ENGINES DETAIL */}
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-black text-black text-center">🔬 Moteurs Cognitifs OSAI V8/V9</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Eye, name: "OSAI EmotiSense™ — Theory of Mind", desc: "Modélise l'état mental de l'enfant via le framework de Piaget : croyances, attentes, niveau cognitif. Adapte la complexité linguistique en temps réel (ex: '3 dodos' pour un 4 ans, 'trois nuits' pour un 10 ans).", color: "#F0ABFC" },
              { icon: Heart, name: "OSAI RelationShip™ Engine", desc: "4 phases relationnelles calibrées : Découverte → Confiance → Attachement → Complicité. Crée des inside jokes basées sur l'historique et rappelle des souvenirs partagés.", color: "#FCA5A5" },
              { icon: RefreshCw, name: "OSAI VariaGen™ Engine", desc: "Analyse sémantique des 20 derniers tours de conversation. Assure une variation systématique de la structure, du vocabulaire et du format de réponse via des embeddings locaux.", color: "#86EFAC" },
              { icon: Target, name: "OSAI ProActive™ Engine", desc: "Moteur d'initiative spontanée calibré sur 15 catégories d'intérêt trackées (Espace, Dinosaures, Animaux, Science…). Scoring temporel pour le timing optimal.", color: "#93C5FD" },
              { icon: Sparkles, name: "OSAI AttentionGuard™", desc: "Détection multi-signal de l'ennui, l'hésitation ou le désengagement via analyse de la latence de réponse, longueur des phrases et patterns prosodiques.", color: "#FDE68A" },
              { icon: Cpu, name: "OSAI MasterControl™ V9", desc: "Couche de supervision parentale : orchestration des modes Nuit, École, Calme, Éducatif. Content Orchestration System pour les packs Bobby Store + Fail-Safe automatique.", color: "#C084FC" },
            ].map((engine, i) => (
              <RetroSection key={i} bg={engine.color}>
                <div className="flex items-start gap-3">
                  <engine.icon className="w-6 h-6 text-black flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs md:text-sm font-black text-black mb-1">{engine.name}</h3>
                    <p className="text-[10px] md:text-xs font-black text-black leading-relaxed">{engine.desc}</p>
                  </div>
                </div>
              </RetroSection>
            ))}
          </div>
        </div>

        {/* RESPONSE ASSEMBLY */}
        <RetroSection bg="#FDE68A">
          <h2 className="text-xl md:text-2xl font-black text-black text-center mb-4">💬 OSAI ResponseForge™ — Assemblage V9</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Empathie", desc: "Validation émotionnelle via EmotiSense™. Bobby montre qu'il a compris ce que l'enfant ressent avant toute réponse.", color: "#86EFAC" },
              { step: "2", title: "Contenu", desc: "Réponse cœur via NeuralCore™ + KnowledgeBase™ + MemoryGraph™. Enrichie par le contexte et adaptée à l'âge.", color: "#93C5FD" },
              { step: "3", title: "Relance", desc: "Question ouverte via ProActive™ ou rappel mémoire via MemoryGraph™. Maintient l'engagement naturellement.", color: "#C084FC" },
            ].map(s => (
              <div key={s.step} className="border-3 border-black p-4 text-center relative" style={{ borderWidth: "3px", backgroundColor: s.color }}>
                <div className="absolute -top-4 -left-2 w-8 h-8 bg-black text-white flex items-center justify-center font-black text-sm">{s.step}</div>
                <h3 className="text-sm font-black text-black mb-2 mt-2">{s.title}</h3>
                <p className="text-[10px] font-black text-black">{s.desc}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* SAFETY */}
        <RetroSection bg="#FCA5A5">
          <h2 className="text-xl md:text-2xl font-black text-black text-center mb-3">🔒 OSAI SafeGuard™ — Security Framework</h2>
          <p className="text-[10px] font-black text-black text-center mb-4">
            Framework de sécurité NLP propriétaire — conforme RGPD, COPPA et UK Children's Code.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Pre-Processing", desc: "Safety AVANT toute logique" },
              { label: "Sujets bloqués", desc: "Config parent en temps réel" },
              { label: "Alertes push", desc: "Notifications critiques" },
              { label: "Fail-Safe", desc: "Redirection adulte auto" },
              { label: "Anti-Echo NLP", desc: "Filtrage sémantique" },
              { label: "Existentiel", desc: "Filtres mort/immortalité" },
              { label: "HIBP Check", desc: "Mots de passe compromis" },
              { label: "E2E Encrypt", desc: "Chiffrement bout en bout" },
            ].map((item, i) => (
              <div key={i} className="bg-white/80 border-2 border-black p-2 text-center">
                <p className="text-[10px] font-black text-black">{item.label}</p>
                <p className="text-[8px] font-black text-black">{item.desc}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* PERFORMANCE METRICS */}
        <RetroSection bg="#fff">
          <h2 className="text-xl md:text-2xl font-black text-black text-center mb-4">📊 Performance OSAI Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "< 700ms", label: "Latence E2E", color: "#86EFAC" },
              { value: "4 900+", label: "Entrées KB™", color: "#93C5FD" },
              { value: "225+", label: "Règles SpeechNet™", color: "#FDE68A" },
              { value: "50+", label: "Regex IntentNet™", color: "#C084FC" },
              { value: "90-95%", label: "Traitement local", color: "#FCA5A5" },
              { value: "15", label: "Catégories ProActive™", color: "#86EFAC" },
              { value: "20", label: "Tours VariaGen™", color: "#93C5FD" },
              { value: "3", label: "Phases ResponseForge™", color: "#FDE68A" },
            ].map((m, i) => (
              <div key={i} className="border-3 border-black p-3 text-center" style={{ borderWidth: "3px", backgroundColor: m.color, boxShadow: "3px 3px 0px rgba(0,0,0,0.15)" }}>
                <p className="text-xl md:text-2xl font-black text-black">{m.value}</p>
                <p className="text-[9px] font-black text-black uppercase">{m.label}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* CLOUD BUSINESS PLAN */}
        <RetroSection bg="#FFF5E6">
          <h2 className="text-xl md:text-2xl font-black text-black text-center mb-2">☁️ Bobby Cloud — Business Plan détaillé</h2>
          <p className="text-[10px] font-black text-black text-center mb-6">
            Analyse des coûts réels OSAI Stack et modèle de revenus par abonnement.
          </p>
          <CloudBusinessPlan />
        </RetroSection>

        {/* OSAI / SILVERLIT */}
        <RetroSection bg="#C084FC">
          <div className="text-center space-y-4">
            <h2 className="text-xl md:text-2xl font-black text-black">🏭 Développé par OSAI pour Silverlit</h2>
            <p className="text-xs font-black text-black max-w-2xl mx-auto leading-relaxed">
              Bobby Brain Intelligence V9 est une stack technologique propriétaire complète développée par OSAI (Orange Agency) 
              exclusivement pour Silverlit. NeuralCore™, VoiceLab™, SafeGuard™, EmotiSense™, MemoryGraph™, IntentNet™, 
              ResponseForge™ et ProActive™ sont des technologies OSAI protégées.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
              {[
                { val: "V9", label: "Version actuelle", color: "#FDE68A" },
                { val: "OSAI", label: "Développeur", color: "#86EFAC" },
                { val: "Silverlit", label: "Distributeur", color: "#93C5FD" },
              ].map((item, i) => (
                <div key={i} className="border-2 border-black p-3 text-center" style={{ backgroundColor: item.color }}>
                  <p className="text-lg font-black text-black">{item.val}</p>
                  <p className="text-[9px] font-black text-black">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </RetroSection>
      </div>

      {/* FOOTER */}
      <footer className="border-t-4 border-black bg-black text-white py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-black text-white">© 2026 Bobby — OSAI Technology for Silverlit — Tous droits réservés</p>
          <p className="text-[9px] font-black text-white mt-1">
            NeuralCore™ • VoiceLab™ • SafeGuard™ • EmotiSense™ • MemoryGraph™ • IntentNet™ • ResponseForge™ • ProActive™ • VariaGen™ • AttentionGuard™ • MasterControl™
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Technologie;
