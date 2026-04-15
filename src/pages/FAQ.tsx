import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useState } from "react";

const RetroTag = ({ children, bg = "var(--retro-yellow)" }: { children: React.ReactNode; bg?: string }) => (
  <span className="inline-block px-3 py-1 text-[10px] font-black uppercase border-2 border-black text-black" style={{ backgroundColor: bg }}>{children}</span>
);

const FAQS = [
  { q: "À partir de quel âge Bobby est-il adapté ?", a: "Bobby est conçu pour les enfants de 3 à 12 ans. L'IA adapte automatiquement son langage, sa complexité et ses activités en fonction de l'âge configuré par les parents." },
  { q: "Bobby fonctionne-t-il sans internet ?", a: "Bobby dispose d'un mode offline complet avec un cerveau local, des jeux (quiz, 20 questions) et des réponses pré-calculées. La connexion internet permet d'accéder à Gemini 3 Flash pour des conversations plus riches." },
  { q: "Les conversations sont-elles enregistrées ?", a: "Les conversations sont transcrites et stockées de manière sécurisée pour permettre l'analyse émotionnelle dans le dashboard parent. Les données sont chiffrées et hébergées en Europe, conformément au RGPD." },
  { q: "Comment fonctionne le contrôle parental ?", a: "Les parents accèdent au dashboard via un QR code dédié protégé par PIN. Ils peuvent configurer les limites de temps, bloquer des sujets, activer les modes Nuit/École/Calme et recevoir des alertes en temps réel." },
  { q: "Quelle est la différence entre Bobby gratuit et Bobby+ ?", a: "La version gratuite offre 5 minutes de conversation par jour et 3 histoires. Bobby+ (9.99€/mois) débloque la conversation illimitée, toutes les voix, le Bobby Store complet, le dashboard parent et la mémoire Cloud." },
  { q: "Bobby peut-il dire des choses inappropriées ?", a: "Non. Le Safety Pipeline traite chaque message AVANT toute autre logique. Les contenus inappropriés sont bloqués, les sujets sensibles redirigent vers un adulte, et les parents peuvent bloquer des thématiques spécifiques." },
  { q: "Comment Bobby apprend-il ?", a: "Bobby utilise un système d'auto-apprentissage sécurisé qui enrichit sa base de connaissances (4900+ entrées) via l'analyse des sessions. Chaque nouvelle entrée est validée par des scores de confiance et de qualité." },
  { q: "Puis-je utiliser Bobby sur plusieurs appareils ?", a: "Oui, avec Bobby Cloud. La synchronisation multi-appareils permet de retrouver la mémoire, les préférences et l'historique de conversation de l'enfant sur n'importe quel appareil." },
  { q: "Quelle technologie IA Bobby utilise-t-il ?", a: "Bobby utilise Gemini 3 Flash Preview de Google comme moteur principal, avec un cerveau local comme fallback. La voix est synthétisée par ElevenLabs avec un profil enfant exclusif." },
  { q: "Bobby est-il disponible en magasin ?", a: "Bobby est actuellement en précommande à 89€ (au lieu de 129€). Le lancement retail est prévu pour Q3 2026. L'application web est disponible gratuitement dès maintenant." },
  { q: "Quelles données Bobby collecte-t-il ?", a: "Bobby collecte uniquement les données nécessaires : transcriptions de conversation, émotions détectées, centres d'intérêt. Aucune donnée biométrique n'est collectée. Tout est conforme RGPD et supprimable sur demande." },
  { q: "Bobby parle-t-il d'autres langues ?", a: "Bobby est actuellement optimisé pour le français. Le support multilingue est prévu dans les futures mises à jour." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-4 border-black" style={{ boxShadow: "4px 4px 0px rgba(0,0,0,0.2)" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 bg-white text-left hover:bg-gray-50 transition-colors">
        <span className="text-sm font-black text-black pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-black flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="p-4 border-t-3 border-black" style={{ borderTopWidth: "3px", backgroundColor: "var(--retro-blue)" }}>
          <p className="text-xs font-black text-black leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

const FAQ = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      <nav className="sticky top-0 z-50 border-b-4 border-black bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-black text-black hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" /> Bobby
          </button>
          <RetroTag bg="var(--retro-yellow)">FAQ</RetroTag>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-black">❓ Questions fréquentes</h1>
          <p className="text-sm font-black text-black">Tout ce que les parents veulent savoir sur Bobby.</p>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => <FAQItem key={i} {...faq} />)}
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

export default FAQ;
