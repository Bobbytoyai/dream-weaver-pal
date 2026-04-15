import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Sparkles, Shield, Brain, Mic, CloudLightning, Star, ChevronDown, Play, MessageCircle, BookOpen, Gamepad2, Music, Heart } from "lucide-react";
import bobbyHero from "@/assets/bobby-hero.png";

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
  <span className="inline-block px-3 py-1 text-[10px] font-black uppercase border-2 border-black text-black"
    style={{ backgroundColor: bg }}>
    {children}
  </span>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FEATURE DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FEATURES = [
  { icon: Brain, title: "IA Conversationnelle", desc: "Bobby comprend, s'adapte et répond naturellement grâce à OSAI NeuralCore™.", bg: "var(--retro-purple)" },
  { icon: Mic, title: "Voix Naturelle", desc: "Synthèse vocale OSAI VoiceLab™ avec voix enfant expressive et chaleureuse.", bg: "var(--retro-green)" },
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
            <span className="text-xl font-black text-black">Bobby</span>
            <RetroTag bg="var(--retro-red)">Précommande</RetroTag>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs font-black uppercase text-black">
            <a href="#features" className="hover:opacity-70 transition-opacity">Fonctions</a>
            <a href="#store" className="hover:opacity-70 transition-opacity">Store</a>
            <a href="#pricing" className="hover:opacity-70 transition-opacity">Prix</a>
            <a href="/technologie" className="hover:opacity-70 transition-opacity">Technologie</a>
          </div>
          <RetroButton onClick={() => navigate("/precommande")} size="sm"><span className="flex items-center gap-1.5"><ShoppingCart className="w-4 h-4" /> Précommander</span></RetroButton>
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
            <p className="text-base md:text-lg font-black text-black max-w-lg">
              Bobby est un compagnon IA qui écoute, comprend et s'adapte à chaque enfant. 
              Histoires, jeux, apprentissage — le tout dans un cadre 100% sécurisé.
            </p>
            <div className="flex flex-wrap gap-3">
              <RetroButton onClick={() => navigate("/precommande")} variant="primary" size="lg">
                <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Précommander</span>
              </RetroButton>
            </div>
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer">
                <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/fr-fr?size=250x83" alt="Télécharger sur l'App Store" className="h-10" />
              </a>
              <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer">
                <img src="https://play.google.com/intl/en_us/badges/static/images/badges/fr_badge_web_generic.png" alt="Disponible sur Google Play" className="h-[60px]" />
              </a>
            </div>
          </div>
          <div className="relative flex justify-center items-center">
            <video
              ref={(el) => { if (el) el.playbackRate = 0.7; }}
              src="/bobby-demo.mov"
              autoPlay
              loop
              muted
              playsInline
              className="relative w-72 md:w-[420px] rounded-2xl border-4 border-black drop-shadow-2xl"
              style={{ boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}
            />
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-black" />
        </div>
      </header>

      {/* ── WHAT IS BOBBY ── */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">


        {/* ── FEATURES ── */}
        <div id="features" className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-black text-black text-center">✨ Pourquoi Bobby ?</h2>
          <p className="text-sm font-black text-black text-center max-w-xl mx-auto">
            Bien plus qu'un jouet — Bobby est le premier compagnon IA vraiment conçu pour les enfants.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <RetroSection key={i} bg={f.bg} className="hover:translate-y-[-4px] transition-transform cursor-default">
                <f.icon className="w-8 h-8 text-black mb-3" />
                <h3 className="text-base font-black text-black mb-1">{f.title}</h3>
                <p className="text-xs font-black text-black leading-relaxed">{f.desc}</p>
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
                <p className="text-xs font-black text-black">{s.desc}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* ── BOBBY STORE ── */}
        <div id="store" className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-black text-black text-center">🛒 Bobby Store</h2>
          <p className="text-sm font-black text-black text-center max-w-xl mx-auto">
            Enrichissez Bobby avec des packs de contenu éducatif, des histoires et des jeux.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STORE_PACKS.map((p, i) => (
              <RetroSection key={i} bg={p.bg} className="hover:translate-y-[-4px] transition-transform cursor-pointer">
                <span className="text-4xl block mb-2">{p.emoji}</span>
                <h3 className="text-sm font-black text-black mb-1">{p.name}</h3>
                <p className="text-[10px] font-black text-black leading-relaxed">{p.desc}</p>
              </RetroSection>
            ))}
          </div>
          <div className="flex justify-center pt-4">
            <RetroButton onClick={() => navigate("/store")} variant="primary" size="lg">
              <span className="flex items-center gap-2">🛒 Visiter le Bobby Store</span>
            </RetroButton>
          </div>
        </div>

        {/* ── BOBBY EN ACTION ── */}
        <div id="demo">
          <RetroSection bg="var(--retro-yellow)">
            <div className="text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-black text-black">🎬 Bobby en action</h2>
              <p className="text-sm font-black text-black max-w-2xl mx-auto">
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
                    <p className="text-[9px] font-black text-black">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </RetroSection>
        </div>

        {/* ── PARENT DASHBOARD ── */}
        <RetroSection bg="var(--retro-red)">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-black text-black">📊 Dashboard Parent</h2>
              <p className="text-sm font-black text-black leading-relaxed">
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
                  <li key={i} className="flex items-start gap-2 text-xs font-black text-black">
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
                  <p className="text-[9px] font-black text-black uppercase">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </RetroSection>

        {/* ── SECURITY ── */}
        <RetroSection bg="#fff">
          <div className="text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-black">🔒 Sécurité absolue</h2>
            <p className="text-sm font-black text-black max-w-2xl mx-auto">
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
                  <p className="text-[9px] font-black text-black">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </RetroSection>

        {/* ── PRICING ── */}
        <div id="pricing" className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-black text-black text-center">💰 Tarifs Bobby Cloud</h2>
          <p className="text-sm font-black text-black text-center">Choisissez le plan adapté à votre famille</p>
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
                    <span className="text-xs font-black text-black">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 text-left">
                    {plan.features.map((f, j) => (
                      <li key={j} className="text-xs font-black text-black flex items-start gap-2">
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


        {/* ── TESTIMONIALS ── */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-black text-center">💬 Ce que disent les parents</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <RetroSection key={i} bg="#fff" className="hover:translate-y-[-2px] transition-transform">
                <div className="flex gap-0.5 mb-2">{Array.from({ length: t.stars }, (_, j) => <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}</div>
                <p className="text-xs font-black text-black italic leading-relaxed">"{t.text}"</p>
                <p className="text-[10px] font-black text-black mt-2">— {t.name}</p>
              </RetroSection>
            ))}
          </div>
        </div>


        {/* ── VIDEO TV + TEXTE ── */}
        <div className="mt-8 flex flex-col md:flex-row items-center gap-6">
          <div className="md:w-1/2">
            <video
              src="/videos/bobby-tv.mp4"
              controls
              playsInline
              preload="auto"
              className="w-full border-4 border-black rounded-lg"
              style={{ boxShadow: "6px 6px 0 rgba(0,0,0,0.2)" }}
            />
          </div>
          <div className="md:w-1/2 text-center md:text-left space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-black uppercase">📺 Ils nous ont vu</h2>
            <p className="text-lg font-black text-black/70">Bobby a été présenté sur les plus grandes chaînes françaises. Découvrez le reportage complet !</p>
            <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap">
              {[
                { name: "TF1", src: "/images/logos/tf1.png" },
                { name: "M6", src: "/images/logos/m6.png" },
                { name: "W9", src: "/images/logos/w9.png" },
                { name: "Disney Channel", src: "/images/logos/disney-channel.png" },
              ].map((channel) => (
                <div key={channel.name} className="px-3 py-2 bg-white rounded-lg border-2 border-black">
                  <img src={channel.src} alt={channel.name} className="h-8 md:h-10 w-auto object-contain" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t-4 border-black bg-black text-white py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-black">Bobby</span>
              </div>
              <p className="text-xs text-white font-bold">Le compagnon IA intelligent et sécurisé pour les enfants de 3 à 12 ans.</p>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase mb-2 text-white">Produit</h4>
              <ul className="space-y-1.5 text-xs text-white font-black">
                <li><a href="/fonctionnalites" className="hover:underline">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:underline">Tarifs</a></li>
                <li><a href="#store" className="hover:underline">Bobby Store</a></li>
                <li><a href="/technologie" className="hover:underline">Technologie</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase mb-2 text-white">Parents</h4>
              <ul className="space-y-1.5 text-xs text-white font-black">
                <li><a href="/guide" className="hover:underline">Guide d'utilisation</a></li>
                <li><a href="/securite" className="hover:underline">Sécurité & confidentialité</a></li>
                <li><a href="/faq" className="hover:underline">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase mb-2 text-white">Contact</h4>
              <ul className="space-y-1.5 text-xs text-white font-black">
                <li><a href="mailto:hello@bobby-toy.shop" className="hover:underline">hello@bobby-toy.shop</a></li>
                <li><a href="/contact" className="hover:underline">Support</a></li>
                <li><a href="/contact" className="hover:underline">Presse</a></li>
                <li><a href="/contact" className="hover:underline">Investisseurs</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 mt-6 pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[10px] text-white font-black">© 2026 Bobby — Tous droits réservés</p>
            <div className="flex gap-4 text-[10px] text-white font-black">
              <a href="/mentions-legales" className="hover:underline">Mentions légales</a>
              <a href="/mentions-legales" className="hover:underline">CGV</a>
              <a href="/mentions-legales" className="hover:underline">Politique de confidentialité</a>
              <a href="/mentions-legales" className="hover:underline">RGPD</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
