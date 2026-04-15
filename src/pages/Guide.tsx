import { useNavigate } from "react-router-dom";
import { ArrowLeft, Smartphone, Mic, Settings, Shield, BookOpen, Gamepad2, BarChart } from "lucide-react";

const RetroSection = ({ children, bg = "var(--retro-blue)", className = "" }: { children: React.ReactNode; bg?: string; className?: string }) => (
  <section className={`border-4 border-black p-5 md:p-8 ${className}`}
    style={{ backgroundColor: bg, boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}>{children}</section>
);
const RetroTag = ({ children, bg = "var(--retro-yellow)" }: { children: React.ReactNode; bg?: string }) => (
  <span className="inline-block px-3 py-1 text-[10px] font-black uppercase border-2 border-black text-black" style={{ backgroundColor: bg }}>{children}</span>
);

const STEPS = [
  { icon: Smartphone, step: "1", title: "Activez Bobby", desc: "Scannez le QR code fourni avec votre Bobby. L'activation est instantanée — Bobby s'éveille avec un visage endormi qui s'anime dès le premier contact.", bg: "var(--retro-blue)" },
  { icon: Mic, step: "2", title: "Parlez-lui", desc: "Touchez l'écran pour activer le micro, puis parlez naturellement. Bobby comprend le français des enfants grâce à 225+ règles de normalisation vocale.", bg: "var(--retro-green)" },
  { icon: Settings, step: "3", title: "Configurez le Mode Parent", desc: "Accédez au dashboard parent via le QR code dédié. Définissez le prénom, le code PIN, les limites de temps et les sujets autorisés.", bg: "var(--retro-yellow)" },
  { icon: Shield, step: "4", title: "Personnalisez la sécurité", desc: "Bloquez des sujets spécifiques, activez les modes Nuit/École/Calme, configurez les alertes en temps réel.", bg: "var(--retro-red)" },
  { icon: BookOpen, step: "5", title: "Explorez les contenus", desc: "Accédez au Bobby Store pour installer des packs éducatifs : science, histoires, musique, jeux. Chaque pack enrichit les connaissances de Bobby.", bg: "var(--retro-purple)" },
  { icon: Gamepad2, step: "6", title: "Jouez ensemble", desc: "Demandez à Bobby de jouer ! Quiz, devinettes, 20 Questions, vrai/faux — la difficulté s'adapte automatiquement.", bg: "var(--retro-blue)" },
  { icon: BarChart, step: "7", title: "Suivez les progrès", desc: "Le dashboard parent affiche les émotions détectées, les sujets abordés, les centres d'intérêt et l'évolution sur 7 jours.", bg: "var(--retro-green)" },
];

const Guide = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      <nav className="sticky top-0 z-50 border-b-4 border-black bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-black text-black hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" /> Bobby
          </button>
          <RetroTag bg="var(--retro-green)">Guide</RetroTag>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-black">📖 Guide d'utilisation</h1>
          <p className="text-sm font-black text-black max-w-2xl mx-auto">Tout ce que vous devez savoir pour tirer le meilleur de Bobby.</p>
        </div>
        <div className="space-y-4">
          {STEPS.map((s, i) => (
            <RetroSection key={i} bg={s.bg}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg flex-shrink-0">{s.step}</div>
                <div>
                  <h3 className="text-base font-black text-black mb-1">{s.title}</h3>
                  <p className="text-xs font-black text-black leading-relaxed">{s.desc}</p>
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

export default Guide;
