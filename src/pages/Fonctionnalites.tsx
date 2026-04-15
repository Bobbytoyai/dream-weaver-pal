import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, Mic, Shield, CloudLightning, BookOpen, Gamepad2, Music, Heart, Eye, Zap, MessageCircle, Bell, Lock } from "lucide-react";

const RetroSection = ({ children, bg = "var(--retro-blue)", className = "" }: { children: React.ReactNode; bg?: string; className?: string }) => (
  <section className={`border-4 border-black p-5 md:p-8 ${className}`}
    style={{ backgroundColor: bg, boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}>
    {children}
  </section>
);
const RetroTag = ({ children, bg = "var(--retro-yellow)" }: { children: React.ReactNode; bg?: string }) => (
  <span className="inline-block px-3 py-1 text-[10px] font-black uppercase border-2 border-black text-black" style={{ backgroundColor: bg }}>{children}</span>
);

const FEATURES = [
  { icon: Brain, title: "IA Conversationnelle Gemini 3 Flash", desc: "Bobby utilise le dernier modèle Google Gemini pour comprendre et répondre naturellement. Chaque réponse est structurée en 3 phases : empathie, contenu et relance. L'historique de 50 messages garantit une cohérence totale.", bg: "var(--retro-purple)" },
  { icon: Mic, title: "Voix Naturelle ElevenLabs", desc: "Synthèse vocale avec le profil 'Enfant' exclusif. La voix est chaleureuse, expressive et adaptée à chaque émotion détectée. Lip sync en temps réel avec le visage 3D holographique.", bg: "var(--retro-green)" },
  { icon: Shield, title: "Sécurité Absolue", desc: "Le Safety Pipeline traite AVANT toute autre logique. Filtrage IA des contenus inappropriés, sujets bloqués configurables, alertes parent en temps réel, redirection vers un adulte en cas critique.", bg: "var(--retro-red)" },
  { icon: CloudLightning, title: "Bobby Cloud", desc: "Mémoire persistante entre les sessions. Synchronisation multi-appareils. Tableau de bord parent complet avec analyse émotionnelle IA, transcriptions et graphiques d'évolution.", bg: "var(--retro-blue)" },
  { icon: BookOpen, title: "Histoires Interactives", desc: "Bibliothèque de 50+ contes avec choix multiples. Lecteur style YouTube avec pause, reprise et navigation. Préchargement de 3 segments pour une expérience fluide.", bg: "var(--retro-yellow)" },
  { icon: Gamepad2, title: "Jeux Éducatifs", desc: "Quiz progressifs (40+ questions), jeu des 20 Questions, vrai/faux éducatif. Difficulté dynamique adaptée à l'âge et au niveau de l'enfant.", bg: "var(--retro-purple)" },
  { icon: Music, title: "Musique & Comptines", desc: "Bibliothèque musicale avec comptines, berceuses et chansons éducatives. Détection automatique des demandes musicales. Particules visuelles synchronisées.", bg: "var(--retro-green)" },
  { icon: Eye, title: "Visage 3D Holographique", desc: "Rendu Three.js en temps réel avec expressions faciales exagérées (style anime/Pixar). Paupières rideau, lip sync visémique, micro-mouvements naturels et suivi du regard.", bg: "var(--retro-blue)" },
  { icon: Heart, title: "Intelligence Émotionnelle", desc: "Détection des émotions en temps réel. Theory of Mind pour modéliser l'état mental de l'enfant. Adaptation du langage selon l'âge et le niveau cognitif.", bg: "var(--retro-red)" },
  { icon: MessageCircle, title: "Écoute Active", desc: "Onomatopées naturelles ('hmm', 'ah') pendant que l'enfant parle. Buffer de 1200ms pour les phrases naturelles. Aucune interruption accidentelle.", bg: "var(--retro-yellow)" },
  { icon: Bell, title: "Alertes Parent", desc: "Notifications en temps réel pour les situations sensibles (tristesse, violence, harcèlement). Sévérité graduée avec contexte détaillé.", bg: "var(--retro-red)" },
  { icon: Lock, title: "Contrôle Parental", desc: "Modes Nuit, École, Calme, Éducatif. Limites de temps, sujets bloqués, PIN d'accès. Dashboard complet avec transcriptions et analyses.", bg: "var(--retro-purple)" },
];

const Fonctionnalites = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      <nav className="sticky top-0 z-50 border-b-4 border-black bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-black text-black hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" /> Bobby
          </button>
          <RetroTag bg="var(--retro-blue)">Fonctionnalités</RetroTag>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-black">✨ Toutes les fonctionnalités</h1>
          <p className="text-sm font-black text-black max-w-2xl mx-auto">Découvrez tout ce que Bobby peut faire pour votre enfant.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <RetroSection key={i} bg={f.bg}>
              <div className="flex items-start gap-3">
                <f.icon className="w-7 h-7 text-black flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black text-black mb-2">{f.title}</h3>
                  <p className="text-xs font-black text-black leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </RetroSection>
          ))}
        </div>
      </div>
      <footer className="border-t-4 border-black bg-black text-white py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-black text-white">© 2026 Bobby — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
};

export default Fonctionnalites;
