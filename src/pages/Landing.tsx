import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Sparkles, Shield, Brain, Mic, CloudLightning, Star, ChevronDown, Play, MessageCircle, BookOpen, Gamepad2, Music, Heart } from "lucide-react";
import bobbyHero from "@/assets/bobby-hero.png";
import companionAvatar from "@/assets/companion-avatar.png";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RETRO UI PRIMITIVES (same design system as Parent Mode)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RetroSection = ({ children, bg = "var(--retro-blue)", className = "" }: { children: React.ReactNode; bg?: string; className?: string }) => (
  <section className={`border-4 border-black p-5 md:p-8 ${className}`}
    style={{ backgroundColor: bg, boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}>
    {children}
  </section>
);

const RetroButton = ({ children, onClick, variant = "primary", size = "md" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "accent"; size?: "sm" | "md" | "lg"
}) => {
  const sizeClasses = size === "lg" ? "py-4 px-8 text-base" : size === "sm" ? "py-2 px-4 text-xs" : "py-3 px-6 text-sm";
  const colorClasses = variant === "primary"
    ? "bg-black text-white hover:bg-gray-800"
    : variant === "accent"
      ? "bg-[#ff6b6b] text-white hover:bg-[#ff5252]"
      : "bg-white text-black hover:bg-gray-100";
  return (
    <button onClick={onClick}
      className={`${sizeClasses} font-black uppercase border-3 border-black transition-all hover:translate-y-[-2px] active:translate-y-[1px] ${colorClasses}`}
      style={{ borderWidth: "3px", boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}>
      {children}
    </button>
  );
};

const RetroTag = ({ children, bg = "var(--retro-yellow)" }: { children: React.ReactNode; bg?: string }) => (
  <span className="inline-block px-3 py-1 text-[10px] font-black uppercase border-2 border-black"
    style={{ backgroundColor: bg }}>
    {children}
  </span>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FEATURE DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FEATURES = [
  { icon: Brain, title: "IA Conversationnelle", desc: "Bobby comprend, s'adapte et répond naturellement grâce à Gemini 3 Flash.", bg: "var(--retro-purple)" },
  { icon: Mic, title: "Voix Naturelle", desc: "Synthèse vocale ElevenLabs avec voix enfant expressive et chaleureuse.", bg: "var(--retro-green)" },
  { icon: Shield, title: "100% Sécurisé", desc: "Filtrage strict, sujets bloqués, alertes parent en temps réel.", bg: "var(--retro-red)" },
  { icon: CloudLightning, title: "Bobby Cloud", desc: "Mémoire persistante, sync multi-appareils, tableau de bord parent.", bg: "var(--retro-blue)" },
  { icon: BookOpen, title: "Histoires & Contes", desc: "Bibliothèque d'histoires interactives adaptées à l'âge de l'enfant.", bg: "var(--retro-yellow)" },
  { icon: Gamepad2, title: "Jeux Éducatifs", desc: "Quiz, devinettes, vrai/faux — Bobby rend l'apprentissage amusant.", bg: "var(--retro-purple)" },
];

const STORE_PACKS = [
  { emoji: "🧠", name: "Pack Science", desc: "200+ réponses sur l'espace, les animaux, le corps humain", bg: "var(--retro-blue)" },
  { emoji: "📖", name: "Pack Histoires", desc: "50 contes interactifs avec choix multiples", bg: "var(--retro-green)" },
  { emoji: "🎵", name: "Pack Musique", desc: "Comptines, berceuses et chansons éducatives", bg: "var(--retro-yellow)" },
  { emoji: "🎮", name: "Pack Jeux", desc: "Quiz animaux, devinettes, vrai/faux éducatif", bg: "var(--retro-purple)" },
];

const CLOUD_PLANS = [
  { name: "Gratuit", price: "0€", period: "/mois", features: ["5 min/jour de conversation", "Voix Bobby basique", "3 histoires/jour"], bg: "var(--retro-green)", popular: false },
  { name: "Bobby+", price: "9.99€", period: "/mois", features: ["Conversation illimitée", "Toutes les voix", "Bobby Store complet", "Dashboard parent", "Mémoire Cloud"], bg: "var(--retro-blue)", popular: true },
  { name: "Bobby Pro", price: "19.99€", period: "/mois", features: ["Tout Bobby+", "Multi-enfants", "Analyse IA avancée", "Alertes prioritaires", "Support dédié"], bg: "var(--retro-purple)", popular: false },
];

const TESTIMONIALS = [
  { name: "Marie L.", text: "Mon fils de 5 ans adore Bobby ! Il lui raconte ses journées comme à un vrai ami.", stars: 5 },
  { name: "Thomas P.", text: "Le dashboard parent est incroyable. On voit exactement les émotions de notre fille.", stars: 5 },
  { name: "Sophie K.", text: "Enfin un jouet intelligent vraiment sécurisé. Bobby ne dit jamais rien d'inapproprié.", stars: 5 },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LANDING PAGE COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Landing = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="parent-light min-h-screen" style={{ backgroundColor: "#FDF6EC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b-4 border-black bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={companionAvatar} alt="Bobby" className="w-10 h-10 rounded-full border-2 border-black" />
            <span className="text-xl font-black text-black">Bobby</span>
            <RetroTag bg="var(--retro-red)">Précommande</RetroTag>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs font-black uppercase text-black/70">
            <a href="#features" className="hover:text-black transition-colors">Fonctions</a>
            <a href="#store" className="hover:text-black transition-colors">Store</a>
            <a href="#pricing" className="hover:text-black transition-colors">Prix</a>
            <a href="#demo" className="hover:text-black transition-colors">Démo</a>
          </div>
          <RetroButton onClick={() => navigate("/app")} size="sm">Essayer Bobby</RetroButton>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="relative overflow-hidden py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              <RetroTag>IA Enfant</RetroTag>
              <RetroTag bg="var(--retro-green)">3-12 ans</RetroTag>
              <RetroTag bg="var(--retro-purple)">Made in France</RetroTag>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-black leading-[1.1]">
              Le meilleur ami
              <br />
              <span className="inline-block border-4 border-black px-3 py-1 mt-2" style={{ backgroundColor: "var(--retro-blue)" }}>
                intelligent
              </span>
              <br />
              de votre enfant
            </h1>
            <p className="text-base md:text-lg font-bold text-black/70 max-w-lg">
              Bobby est un compagnon IA qui écoute, comprend et s'adapte à chaque enfant. 
              Histoires, jeux, apprentissage — le tout dans un cadre 100% sécurisé.
            </p>
            <div className="flex flex-wrap gap-3">
              <RetroButton onClick={() => navigate("/app")} variant="primary" size="lg">
                <span className="flex items-center gap-2"><Play className="w-5 h-5" /> Essayer gratuitement</span>
              </RetroButton>
              <RetroButton onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} variant="secondary" size="lg">
                <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Précommander</span>
              </RetroButton>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex -space-x-2">
                {["😊", "🥰", "😄"].map((e, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center text-sm">{e}</div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}</div>
                <p className="text-[10px] font-black text-black/60">+2000 familles en attente</p>
              </div>
            </div>
          </div>
          <div className="relative flex justify-center">
            <div className="absolute -inset-10 rounded-full opacity-30" style={{ background: "radial-gradient(circle, var(--retro-blue) 0%, transparent 70%)" }} />
            <img src={bobbyHero} alt="Bobby - Compagnon IA pour enfants"
              className="relative w-72 md:w-96 drop-shadow-2xl"
              style={{ animation: "float 4s ease-in-out infinite", transform: `translateY(${Math.sin(scrollY * 0.005) * 5}px)` }} />
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-black/40" />
        </div>
      </header>

      {/* ── WHAT IS BOBBY ── */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">

        {/* Video/Demo Section */}
        <div id="demo">
          <RetroSection bg="var(--retro-yellow)">
            <div className="text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-black text-black">🎬 Bobby en action</h2>
              <p className="text-sm font-bold text-black/70 max-w-2xl mx-auto">
                Touchez Bobby pour lui parler. Il écoute, comprend et répond avec sa voix d'enfant. 
                Chaque conversation est unique et adaptée à l'âge de votre enfant.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                {[
                  { emoji: "💬", label: "Conversation", desc: "Il comprend tout" },
                  { emoji: "📖", label: "Histoires", desc: "Contes interactifs" },
                  { emoji: "🎮", label: "Jeux", desc: "Quiz & devinettes" },
                  { emoji: "🎵", label: "Musique", desc: "Comptines & berceuses" },
                ].map(item => (
                  <div key={item.label} className="border-3 border-black bg-white p-3 text-center" style={{ borderWidth: "3px" }}>
                    <span className="text-3xl block mb-1">{item.emoji}</span>
                    <p className="text-xs font-black text-black">{item.label}</p>
                    <p className="text-[9px] font-bold text-black/60">{item.desc}</p>
                  </div>
                ))}
              </div>
              <RetroButton onClick={() => navigate("/app")} variant="accent" size="lg">
                <span className="flex items-center gap-2"><Mic className="w-5 h-5" /> Parler à Bobby maintenant</span>
              </RetroButton>
            </div>
          </RetroSection>
        </div>

        {/* ── FEATURES ── */}
        <div id="features" className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-black text-black text-center">✨ Pourquoi Bobby ?</h2>
          <p className="text-sm font-bold text-black/60 text-center max-w-xl mx-auto">
            Bien plus qu'un jouet — Bobby est le premier compagnon IA vraiment conçu pour les enfants.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <RetroSection key={i} bg={f.bg} className="hover:translate-y-[-4px] transition-transform cursor-default">
                <f.icon className="w-8 h-8 text-black mb-3" />
                <h3 className="text-base font-black text-black mb-1">{f.title}</h3>
                <p className="text-xs font-bold text-black/70 leading-relaxed">{f.desc}</p>
              </RetroSection>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <RetroSection bg="#fff">
          <h2 className="text-2xl md:text-3xl font-black text-black text-center mb-6">🔧 Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", emoji: "📦", title: "Recevez Bobby", desc: "Un jouet physique ou l'app web. Bobby est prêt en 30 secondes.", bg: "var(--retro-blue)" },
              { step: "2", emoji: "🗣️", title: "Parlez-lui", desc: "Touchez Bobby et parlez naturellement. Il comprend le français des enfants.", bg: "var(--retro-green)" },
              { step: "3", emoji: "📊", title: "Suivez tout", desc: "Dashboard parent avec émotions, sujets, alertes et analyse IA des sessions.", bg: "var(--retro-purple)" },
            ].map(s => (
              <div key={s.step} className="border-3 border-black p-5 text-center relative" style={{ borderWidth: "3px", backgroundColor: s.bg }}>
                <div className="absolute -top-4 -left-2 w-8 h-8 bg-black text-white flex items-center justify-center font-black text-sm">{s.step}</div>
                <span className="text-4xl block mb-3">{s.emoji}</span>
                <h3 className="text-sm font-black text-black mb-1">{s.title}</h3>
                <p className="text-xs font-bold text-black/70">{s.desc}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* ── BOBBY STORE ── */}
        <div id="store" className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-black text-black text-center">🛒 Bobby Store</h2>
          <p className="text-sm font-bold text-black/60 text-center max-w-xl mx-auto">
            Enrichissez Bobby avec des packs de contenu éducatif, des histoires et des jeux.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STORE_PACKS.map((p, i) => (
              <RetroSection key={i} bg={p.bg} className="hover:translate-y-[-4px] transition-transform cursor-pointer">
                <span className="text-4xl block mb-2">{p.emoji}</span>
                <h3 className="text-sm font-black text-black mb-1">{p.name}</h3>
                <p className="text-[10px] font-bold text-black/70 leading-relaxed">{p.desc}</p>
              </RetroSection>
            ))}
          </div>
        </div>

        {/* ── PARENT DASHBOARD ── */}
        <RetroSection bg="var(--retro-red)">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-black text-black">📊 Dashboard Parent</h2>
              <p className="text-sm font-bold text-black/70 leading-relaxed">
                Suivez chaque interaction en temps réel. Bobby analyse les émotions, 
                les centres d'intérêt et les comportements de votre enfant.
              </p>
              <ul className="space-y-2">
                {[
                  "Analyse émotionnelle IA par session",
                  "Transcription complète des conversations",
                  "Alertes automatiques sur sujets sensibles",
                  "Graphiques d'évolution sur 7 jours",
                  "Contrôle total : modes Nuit, École, Calme",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-bold text-black/80">
                    <span className="text-black font-black">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: "😊", label: "Joie", value: "72%", bg: "var(--retro-yellow)" },
                { emoji: "🧐", label: "Curiosité", value: "85%", bg: "var(--retro-blue)" },
                { emoji: "💬", label: "Messages", value: "342", bg: "var(--retro-green)" },
                { emoji: "⏱️", label: "Temps total", value: "4h23", bg: "var(--retro-purple)" },
              ].map(s => (
                <div key={s.label} className="border-3 border-black p-3 text-center" style={{ borderWidth: "3px", backgroundColor: s.bg }}>
                  <span className="text-2xl block">{s.emoji}</span>
                  <p className="text-lg font-black text-black">{s.value}</p>
                  <p className="text-[9px] font-bold text-black/60 uppercase">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </RetroSection>

        {/* ── SECURITY ── */}
        <RetroSection bg="#fff">
          <div className="text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-black">🔒 Sécurité absolue</h2>
            <p className="text-sm font-bold text-black/60 max-w-2xl mx-auto">
              Bobby est le jouet connecté le plus sécurisé du marché. 
              Chaque mot est filtré, chaque conversation est analysée.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {[
                { emoji: "🛡️", label: "Filtrage IA", desc: "Contenu inapproprié bloqué" },
                { emoji: "🔐", label: "Chiffrement", desc: "Données cryptées E2E" },
                { emoji: "👨‍👩‍👧", label: "Contrôle parent", desc: "PIN + alertes temps réel" },
                { emoji: "🇫🇷", label: "RGPD", desc: "Données en Europe" },
              ].map(s => (
                <div key={s.label} className="border-3 border-black p-3 text-center" style={{ borderWidth: "3px", backgroundColor: "var(--retro-green)" }}>
                  <span className="text-2xl block mb-1">{s.emoji}</span>
                  <p className="text-[11px] font-black text-black">{s.label}</p>
                  <p className="text-[9px] font-bold text-black/60">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </RetroSection>

        {/* ── PRICING ── */}
        <div id="pricing" className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-black text-black text-center">💰 Tarifs Bobby Cloud</h2>
          <p className="text-sm font-bold text-black/60 text-center">Choisissez le plan adapté à votre famille</p>
          <div className="grid md:grid-cols-3 gap-4">
            {CLOUD_PLANS.map((plan, i) => (
              <RetroSection key={i} bg={plan.bg} className={`relative ${plan.popular ? "scale-[1.02] md:scale-105" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <RetroTag bg="var(--retro-red)">⭐ Populaire</RetroTag>
                  </div>
                )}
                <div className="text-center space-y-3 pt-2">
                  <h3 className="text-lg font-black text-black">{plan.name}</h3>
                  <div>
                    <span className="text-3xl font-black text-black">{plan.price}</span>
                    <span className="text-xs font-bold text-black/60">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 text-left">
                    {plan.features.map((f, j) => (
                      <li key={j} className="text-xs font-bold text-black/80 flex items-start gap-2">
                        <span className="text-black font-black">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <RetroButton variant={plan.popular ? "accent" : "secondary"} size="md">
                    {plan.price === "0€" ? "Commencer" : "Précommander"}
                  </RetroButton>
                </div>
              </RetroSection>
            ))}
          </div>
        </div>

        {/* ── PREORDER CTA ── */}
        <RetroSection bg="var(--retro-yellow)">
          <div className="text-center space-y-4">
            <RetroTag bg="var(--retro-red)">🚀 Lancement Q3 2026</RetroTag>
            <h2 className="text-2xl md:text-4xl font-black text-black">Précommandez Bobby</h2>
            <p className="text-sm font-bold text-black/70 max-w-lg mx-auto">
              Soyez parmi les premiers à recevoir Bobby. 
              Précommande à <strong className="text-black">89€</strong> au lieu de 129€.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="text-center">
                <p className="text-3xl font-black text-black line-through opacity-40">129€</p>
                <p className="text-[10px] font-bold text-black/50">Prix public</p>
              </div>
              <div className="text-center border-3 border-black bg-white px-6 py-3" style={{ borderWidth: "3px", boxShadow: "4px 4px 0 rgba(0,0,0,0.2)" }}>
                <p className="text-4xl font-black text-black">89€</p>
                <p className="text-[10px] font-bold text-black/70">Précommande</p>
              </div>
            </div>
            <div className="flex justify-center gap-3 flex-wrap">
              <RetroButton variant="primary" size="lg">
                <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Précommander — 89€</span>
              </RetroButton>
              <RetroButton onClick={() => navigate("/app")} variant="secondary" size="lg">
                <span className="flex items-center gap-2"><Play className="w-5 h-5" /> Essayer d'abord</span>
              </RetroButton>
            </div>
            <p className="text-[10px] font-bold text-black/50">🔒 Paiement sécurisé • Livraison gratuite • Satisfait ou remboursé 30 jours</p>
          </div>
        </RetroSection>

        {/* ── TESTIMONIALS ── */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-black text-center">💬 Ce que disent les parents</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <RetroSection key={i} bg="#fff" className="hover:translate-y-[-2px] transition-transform">
                <div className="flex gap-0.5 mb-2">{Array.from({ length: t.stars }, (_, j) => <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}</div>
                <p className="text-xs font-bold text-black/80 italic leading-relaxed">"{t.text}"</p>
                <p className="text-[10px] font-black text-black/60 mt-2">— {t.name}</p>
              </RetroSection>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t-4 border-black bg-black text-white py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={companionAvatar} alt="Bobby" className="w-8 h-8 rounded-full border-2 border-white" />
                <span className="text-lg font-black">Bobby</span>
              </div>
              <p className="text-xs text-white/60 font-bold">Le compagnon IA intelligent et sécurisé pour les enfants de 3 à 12 ans.</p>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase mb-2 text-white/80">Produit</h4>
              <ul className="space-y-1.5 text-xs text-white/60 font-bold">
                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="#store" className="hover:text-white transition-colors">Bobby Store</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Démo live</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase mb-2 text-white/80">Parents</h4>
              <ul className="space-y-1.5 text-xs text-white/60 font-bold">
                <li>Dashboard parent</li>
                <li>Sécurité & confidentialité</li>
                <li>Guide d'utilisation</li>
                <li>FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase mb-2 text-white/80">Contact</h4>
              <ul className="space-y-1.5 text-xs text-white/60 font-bold">
                <li>hello@bobby-toy.shop</li>
                <li>Support</li>
                <li>Presse</li>
                <li>Investisseurs</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 mt-6 pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[10px] text-white/40 font-bold">© 2026 Bobby — Tous droits réservés</p>
            <div className="flex gap-4 text-[10px] text-white/40 font-bold">
              <span>Mentions légales</span>
              <span>CGV</span>
              <span>Politique de confidentialité</span>
              <span>RGPD</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
