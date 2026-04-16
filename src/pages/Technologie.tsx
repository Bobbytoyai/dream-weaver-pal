import { useNavigate } from "react-router-dom";
import { Brain, Shield, Mic, Zap, Heart, Sparkles, ArrowLeft, Eye, Layers } from "lucide-react";
import RetroMobileNav from "@/components/RetroMobileNav";

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

const Technologie = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      <nav className="sticky top-0 z-50 border-b-4 border-black px-4 py-3" style={{ backgroundColor: "#FDF6EC" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RetroMobileNav />
            <button onClick={() => navigate("/")} className="hidden md:flex items-center gap-2 font-black text-black text-sm uppercase hover:opacity-70 transition-opacity">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
          </div>
          <span className="font-black text-black text-lg tracking-tight">BOBBY</span>
          <RetroTag bg="#C084FC">Technologie</RetroTag>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        {/* HEADER */}
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-2 flex-wrap">
            <RetroTag bg="#C084FC">IA Avancée</RetroTag>
            <RetroTag bg="#86EFAC">Made in France</RetroTag>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-black leading-tight">
            La technologie
            <br />
            <span className="inline-block border-4 border-black px-3 py-1 mt-2" style={{ backgroundColor: "#C084FC" }}>
              derrière Bobby
            </span>
          </h1>
          <p className="text-sm font-black text-black max-w-2xl mx-auto">
            Bobby utilise une intelligence artificielle de pointe, spécialement conçue pour interagir
            avec les enfants en toute sécurité et bienveillance.
          </p>
        </div>

        {/* KEY TECH FEATURES */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: Brain, name: "IA Conversationnelle", desc: "Bobby comprend le langage naturel des enfants et répond de manière adaptée à leur âge. Chaque réponse suit un modèle en 3 étapes : empathie, contenu et relance.", color: "#C084FC" },
            { icon: Shield, name: "Sécurité Absolue", desc: "Chaque message est filtré avant tout traitement. Les contenus inappropriés sont bloqués instantanément. Les parents reçoivent des alertes en temps réel.", color: "#FCA5A5" },
            { icon: Mic, name: "Voix Naturelle", desc: "Bobby parle avec une voix d'enfant chaleureuse et expressive. L'intonation s'adapte aux émotions pour une interaction authentique.", color: "#93C5FD" },
            { icon: Heart, name: "Intelligence Émotionnelle", desc: "Bobby détecte les émotions de l'enfant et adapte ses réponses. Il comprend la tristesse, la joie, la frustration et sait comment réagir.", color: "#F0ABFC" },
            { icon: Eye, name: "Visage Expressif", desc: "Un visage 3D avec des expressions faciales exagérées style Pixar. Lip sync en temps réel, clignements naturels et micro-mouvements.", color: "#FDE68A" },
            { icon: Layers, name: "Mémoire Persistante", desc: "Bobby se souvient des conversations précédentes, des préférences et des centres d'intérêt de chaque enfant entre les sessions.", color: "#86EFAC" },
            { icon: Sparkles, name: "Anti-Répétition", desc: "Bobby ne se répète jamais ! Il varie ses structures de phrases, son vocabulaire et ses formats de réponse à chaque interaction.", color: "#A5B4FC" },
            { icon: Zap, name: "Réponse Instantanée", desc: "Bobby répond en moins d'une seconde. L'enfant n'attend jamais — l'interaction est fluide et naturelle comme avec un vrai ami.", color: "#FDBA74" },
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

        {/* HOW IT WORKS — SIMPLIFIED */}
        <RetroSection bg="#fff">
          <h2 className="text-xl md:text-2xl font-black text-black text-center mb-6">⚡ Comment Bobby fonctionne</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: "1", icon: "🗣️", title: "L'enfant parle", desc: "Bobby écoute et comprend le français des enfants", color: "#93C5FD" },
              { step: "2", icon: "🛡️", title: "Filtrage sécurité", desc: "Chaque message est vérifié avant traitement", color: "#FCA5A5" },
              { step: "3", icon: "🧠", title: "IA réfléchit", desc: "Compréhension, émotion, mémoire, adaptation", color: "#C084FC" },
              { step: "4", icon: "💬", title: "Bobby répond", desc: "Voix naturelle, visage expressif, lip sync", color: "#86EFAC" },
            ].map(s => (
              <div key={s.step} className="border-3 border-black p-4 text-center relative" style={{ borderWidth: "3px", backgroundColor: s.color }}>
                <div className="absolute -top-3 -left-2 w-7 h-7 bg-black text-white flex items-center justify-center font-black text-sm">{s.step}</div>
                <span className="text-3xl block mb-2">{s.icon}</span>
                <h3 className="text-xs font-black text-black mb-1">{s.title}</h3>
                <p className="text-[10px] font-black text-black">{s.desc}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* SAFETY */}
        <RetroSection bg="#FCA5A5">
          <h2 className="text-xl md:text-2xl font-black text-black text-center mb-3">🔒 Sécurité & Conformité</h2>
          <p className="text-xs font-black text-black text-center mb-4">
            Bobby respecte les normes les plus strictes en matière de protection des enfants.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "RGPD", desc: "Conforme Europe" },
              { label: "COPPA", desc: "Protection enfants" },
              { label: "Chiffrement", desc: "Données cryptées" },
              { label: "Hébergement EU", desc: "Serveurs en Europe" },
              { label: "Filtrage IA", desc: "Contenu vérifié" },
              { label: "Alertes parent", desc: "Notifications temps réel" },
              { label: "Sujets bloqués", desc: "Config par les parents" },
              { label: "Fail-Safe", desc: "Redirection adulte" },
            ].map((item, i) => (
              <div key={i} className="bg-white/80 border-2 border-black p-2 text-center">
                <p className="text-[10px] font-black text-black">{item.label}</p>
                <p className="text-[8px] font-black text-black">{item.desc}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* PERFORMANCE — CONSUMER FRIENDLY */}
        <RetroSection bg="#fff">
          <h2 className="text-xl md:text-2xl font-black text-black text-center mb-4">📊 Bobby en chiffres</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "< 1s", label: "Temps de réponse", color: "#86EFAC" },
              { value: "100%", label: "Filtrage sécurité", color: "#FCA5A5" },
              { value: "3-12", label: "Ans — adapté", color: "#93C5FD" },
              { value: "∞", label: "Mémoire persistante", color: "#C084FC" },
            ].map((m, i) => (
              <div key={i} className="border-3 border-black p-3 text-center" style={{ borderWidth: "3px", backgroundColor: m.color, boxShadow: "3px 3px 0px rgba(0,0,0,0.15)" }}>
                <p className="text-xl md:text-2xl font-black text-black">{m.value}</p>
                <p className="text-[9px] font-black text-black uppercase">{m.label}</p>
              </div>
            ))}
          </div>
        </RetroSection>
      </div>

      <footer className="border-t-4 border-black bg-black text-white py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-black text-white">© 2026 Bobby — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
};

export default Technologie;
