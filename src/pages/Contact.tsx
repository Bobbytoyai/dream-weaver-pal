import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Headphones, Newspaper } from "lucide-react";

const RetroSection = ({ children, bg = "var(--retro-blue)", className = "" }: { children: React.ReactNode; bg?: string; className?: string }) => (
  <section className={`border-4 border-black p-5 md:p-8 ${className}`}
    style={{ backgroundColor: bg, boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}>{children}</section>
);
const RetroTag = ({ children, bg = "var(--retro-yellow)" }: { children: React.ReactNode; bg?: string }) => (
  <span className="inline-block px-3 py-1 text-[10px] font-black uppercase border-2 border-black text-black" style={{ backgroundColor: bg }}>{children}</span>
);

const CONTACTS = [
  { icon: Mail, title: "Contact Général", email: "hello@bobby-toy.shop", desc: "Pour toute question sur Bobby, nos produits ou nos services.", bg: "var(--retro-blue)" },
  { icon: Headphones, title: "Support Technique", email: "support@bobby-toy.shop", desc: "Problème technique ? Notre équipe vous répond sous 24h.", bg: "var(--retro-green)" },
  { icon: Newspaper, title: "Presse & Médias", email: "presse@bobby-toy.shop", desc: "Demandes presse, interviews et visuels HD disponibles sur demande.", bg: "var(--retro-yellow)" },
];

const Contact = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      <nav className="sticky top-0 z-50 border-b-4 border-black bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-black text-black hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" /> Bobby
          </button>
          <RetroTag bg="var(--retro-blue)">Contact</RetroTag>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-black">📬 Nous contacter</h1>
          <p className="text-sm font-black text-black">Une question ? Nous sommes là pour vous aider.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {CONTACTS.map((c, i) => (
            <RetroSection key={i} bg={c.bg}>
              <c.icon className="w-8 h-8 text-black mb-3" />
              <h3 className="text-base font-black text-black mb-1">{c.title}</h3>
              <a href={`mailto:${c.email}`} className="text-sm font-black text-black underline block mb-2">{c.email}</a>
              <p className="text-xs font-black text-black leading-relaxed">{c.desc}</p>
            </RetroSection>
          ))}
        </div>
        <RetroSection bg="#fff">
          <div className="text-center space-y-3">
            <h2 className="text-xl font-black text-black">🇫🇷 Conçu en France</h2>
            <p className="text-xs font-black text-black">Bobby est conçu et développé en France avec passion.</p>
            <p className="text-xs font-black text-black">Paris, France</p>
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

export default Contact;
