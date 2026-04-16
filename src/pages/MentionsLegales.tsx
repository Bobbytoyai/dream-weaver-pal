import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const RetroSection = ({ children, bg = "var(--retro-blue)", className = "" }: { children: React.ReactNode; bg?: string; className?: string }) => (
  <section className={`border-4 border-black p-5 md:p-8 ${className}`}
    style={{ backgroundColor: bg, boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}>{children}</section>
);
const RetroTag = ({ children, bg = "var(--retro-yellow)" }: { children: React.ReactNode; bg?: string }) => (
  <span className="inline-block px-3 py-1 text-[10px] font-black uppercase border-2 border-black text-black" style={{ backgroundColor: bg }}>{children}</span>
);

const SECTIONS = [
  {
    title: "Éditeur du site",
    bg: "var(--retro-blue)",
    content: (
      <div className="space-y-1 text-xs font-black text-black">
        <p>OSAI (Orange Agency)</p>
        <p>Siège social : Paris, France</p>
        <p>Email : hello@bobby-toy.shop</p>
        <p>Directeur de publication : OSAI</p>
      </div>
    ),
  },
  {
    title: "Hébergement",
    bg: "var(--retro-green)",
    content: (
      <div className="space-y-1 text-xs font-black text-black">
        <p>Les données sont hébergées en Europe conformément au RGPD.</p>
        <p>Infrastructure cloud sécurisée avec chiffrement de bout en bout.</p>
      </div>
    ),
  },
  {
    title: "Propriété intellectuelle",
    bg: "var(--retro-purple)",
    content: (
      <p className="text-xs font-black text-black leading-relaxed">
        Bobby, Bobby Brain, Bobby Brain Intelligence V9 et toutes les technologies associées sont la propriété exclusive d'OSAI, développées pour Silverlit.
        Toute reproduction, représentation, modification ou exploitation non autorisée est interdite.
      </p>
    ),
  },
  {
    title: "Conditions Générales de Vente",
    bg: "var(--retro-yellow)",
    content: (
      <div className="space-y-2 text-xs font-black text-black leading-relaxed">
        <p><strong>Précommande :</strong> Le paiement est effectué au moment de la commande. L'expédition est prévue pour Q3 2026.</p>
        <p><strong>Prix :</strong> Bobby est proposé en précommande à 89€ TTC (prix public : 129€ TTC).</p>
        <p><strong>Livraison :</strong> Gratuite en France métropolitaine.</p>
        <p><strong>Retours :</strong> Satisfait ou remboursé sous 30 jours après réception.</p>
        <p><strong>Abonnement Cloud :</strong> Bobby Cloud+ (9.99€/mois) pour augmenter la mémoire et la base de connaissances de Bobby, résiliable à tout moment. Bobby est 100% gratuit sans abonnement.</p>
      </div>
    ),
  },
  {
    title: "Politique de Confidentialité",
    bg: "var(--retro-red)",
    content: (
      <div className="space-y-2 text-xs font-black text-black leading-relaxed">
        <p><strong>Données collectées :</strong> Prénom de l'enfant, âge, transcriptions de conversation, émotions détectées, centres d'intérêt.</p>
        <p><strong>Finalité :</strong> Personnalisation de l'expérience, analyse pour le dashboard parent, amélioration du service.</p>
        <p><strong>Durée de conservation :</strong> Les données sont conservées pendant la durée de l'abonnement et supprimées sous 30 jours après résiliation.</p>
        <p><strong>Droits :</strong> Accès, rectification, suppression, portabilité — contactez privacy@bobby-toy.shop.</p>
        <p><strong>Cookies :</strong> Bobby utilise uniquement des cookies techniques nécessaires au fonctionnement du service.</p>
      </div>
    ),
  },
  {
    title: "RGPD — Protection des mineurs",
    bg: "var(--retro-green)",
    content: (
      <div className="space-y-2 text-xs font-black text-black leading-relaxed">
        <p>Bobby est conforme au Règlement Général sur la Protection des Données (RGPD), au Children's Online Privacy Protection Act (COPPA) et au UK Children's Code.</p>
        <p>Aucune donnée biométrique n'est collectée. Le prénom de l'enfant est exclu des interactions automatisées. Les parents disposent d'un contrôle total via le dashboard parent.</p>
        <p>DPO : privacy@bobby-toy.shop</p>
      </div>
    ),
  },
];

const MentionsLegales = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      <nav className="sticky top-0 z-50 border-b-4 border-black bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-black text-black hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" /> Bobby
          </button>
          <RetroTag>Légal</RetroTag>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <h1 className="text-3xl md:text-4xl font-black text-black text-center">📜 Mentions Légales</h1>
        {SECTIONS.map((s, i) => (
          <RetroSection key={i} bg={s.bg}>
            <h2 className="text-lg font-black text-black mb-3">{s.title}</h2>
            {s.content}
          </RetroSection>
        ))}
      </div>
      <footer className="border-t-4 border-black bg-black text-white py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-black text-white">© 2026 Bobby — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
};

export default MentionsLegales;
