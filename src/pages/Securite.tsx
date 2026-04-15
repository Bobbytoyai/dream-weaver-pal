import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Bell, Eye, AlertTriangle, Users, Globe, Database, CheckCircle } from "lucide-react";

const RetroSection = ({ children, bg = "var(--retro-blue)", className = "" }: { children: React.ReactNode; bg?: string; className?: string }) => (
  <section className={`border-4 border-black p-5 md:p-8 ${className}`}
    style={{ backgroundColor: bg, boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}>{children}</section>
);
const RetroTag = ({ children, bg = "var(--retro-yellow)" }: { children: React.ReactNode; bg?: string }) => (
  <span className="inline-block px-3 py-1 text-[10px] font-black uppercase border-2 border-black text-black" style={{ backgroundColor: bg }}>{children}</span>
);

const Securite = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      <nav className="sticky top-0 z-50 border-b-4 border-black bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-black text-black hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" /> Bobby
          </button>
          <RetroTag bg="var(--retro-red)">Sécurité</RetroTag>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-black">🔒 Sécurité & Confidentialité</h1>
          <p className="text-sm font-black text-black max-w-2xl mx-auto">
            Bobby est conçu avec la sécurité comme priorité absolue. Conforme RGPD, COPPA et UK Children's Code.
          </p>
        </div>

        <RetroSection bg="var(--retro-red)">
          <h2 className="text-xl font-black text-black mb-4">🛡️ Safety Pipeline — Priorité Absolue</h2>
          <p className="text-xs font-black text-black mb-4">Le filtrage de sécurité s'exécute AVANT toute autre logique (jeux, base de connaissances, IA). Aucun contenu inapproprié ne peut passer.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Violence détectée → Adulte", "Harcèlement → Alerte parent", "Contenu adulte → Bloqué", "Questions existentielles → Filtré"].map((item, i) => (
              <div key={i} className="bg-white/70 border-2 border-black p-3 text-center">
                <p className="text-[10px] font-black text-black">{item}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: Lock, title: "Chiffrement E2E", desc: "Toutes les données sont cryptées en transit et au repos. Les conversations ne sont jamais partagées avec des tiers.", bg: "var(--retro-blue)" },
            { icon: Bell, title: "Alertes Temps Réel", desc: "Les parents reçoivent une notification instantanée lorsque Bobby détecte une situation préoccupante (tristesse, violence, danger).", bg: "var(--retro-yellow)" },
            { icon: Users, title: "Contrôle Parental Total", desc: "Code PIN, sujets bloqués configurables, modes Nuit/École/Calme. Les parents gardent le contrôle complet.", bg: "var(--retro-green)" },
            { icon: Globe, title: "RGPD / COPPA / UK Code", desc: "Conformité totale avec les réglementations européennes et internationales sur la protection des données des mineurs.", bg: "var(--retro-purple)" },
            { icon: Eye, title: "Vie Privée Enfant", desc: "Le prénom de l'enfant est exclu de toutes les interactions automatisées sauf demande explicite. Aucune donnée biométrique collectée.", bg: "var(--retro-red)" },
            { icon: Database, title: "Données en Europe", desc: "Tous les serveurs et données sont hébergés en Europe. Politique de rétention stricte avec suppression sur demande.", bg: "var(--retro-blue)" },
            { icon: AlertTriangle, title: "Fail-Safe System", desc: "En cas de situation critique non gérée, Bobby redirige automatiquement vers un adulte de confiance.", bg: "var(--retro-yellow)" },
            { icon: CheckCircle, title: "Mots de passe sécurisés", desc: "Validation HIBP : les mots de passe compromis sont rejetés automatiquement avec un message clair.", bg: "var(--retro-green)" },
          ].map((item, i) => (
            <RetroSection key={i} bg={item.bg}>
              <div className="flex items-start gap-3">
                <item.icon className="w-6 h-6 text-black flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black text-black mb-1">{item.title}</h3>
                  <p className="text-xs font-black text-black leading-relaxed">{item.desc}</p>
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

export default Securite;
