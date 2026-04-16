import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, X, CheckCircle, Loader2, Users } from "lucide-react";
import RetroMobileNav from "@/components/RetroMobileNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RetroSection = ({ children, bg = "#fff", className = "", id }: { children: React.ReactNode; bg?: string; className?: string; id?: string }) => (
  <section id={id} className={`border-4 border-black p-5 md:p-8 ${className}`}
    style={{ backgroundColor: bg, boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}>
    {children}
  </section>
);

const RetroButton = ({ children, onClick, variant = "primary", size = "md" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary"; size?: "sm" | "md" | "lg"
}) => {
  const sizeClasses = size === "lg" ? "py-4 px-8 text-base" : size === "sm" ? "py-2 px-4 text-xs" : "py-3 px-6 text-sm";
  const colorClasses = variant === "primary" ? "bg-black text-white hover:bg-gray-800" : "bg-white text-black hover:bg-gray-100";
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

const SILICONE_CASES = [
  { name: "Bobby Chat", emoji: "🐱", color: "#D4A574", desc: "Coque chat en silicone premium", price: "14.99€", included: true, img: "/images/cases/chat.png" },
  { name: "Bobby Panda", emoji: "🐼", color: "#2D2D2D", desc: "Coque panda noir & blanc", price: "14.99€", included: false, img: "/images/cases/panda.png" },
  { name: "Bobby Ourson", emoji: "🧸", color: "#C8A06A", desc: "Coque ourson miel chaleureux", price: "14.99€", included: false, img: "/images/cases/ourson.png" },
  { name: "Bobby Lapin", emoji: "🐰", color: "#E0E0E0", desc: "Coque lapin blanc doux", price: "14.99€", included: false, img: "/images/cases/lapin.png" },
];

export default function Precommande() {
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<{ img: string; name: string } | null>(null);
  const [formData, setFormData] = useState({ email: "", firstName: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [preorderCount, setPreorderCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      const { data } = await supabase.rpc("get_preorder_count");
      if (typeof data === "number") setPreorderCount(data);
    };
    fetchCount();
  }, [submitted]);

  const handlePreorder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.firstName) {
      toast.error("Veuillez remplir votre prénom et email.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("preorders").insert({
        email: formData.email.trim().toLowerCase(),
        first_name: formData.firstName.trim(),
        phone: formData.phone.trim(),
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("Cet email est déjà enregistré pour la précommande !");
        } else {
          throw error;
        }
      } else {
        setSubmitted(true);
        toast.success("Précommande enregistrée ! 🎉");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC" }}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b-4 border-black px-4 py-3" style={{ backgroundColor: "#FDF6EC" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RetroMobileNav />
            <button onClick={() => navigate("/")} className="hidden md:flex items-center gap-2 font-black text-black text-sm uppercase hover:opacity-70 transition-opacity">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
          </div>
          <span className="font-black text-black text-lg tracking-tight">BOBBY</span>
          <RetroTag bg="var(--retro-red)">🚀 Q3 2026</RetroTag>
        </div>
      </nav>

      {/* ── COUNTER BANNER ── */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="border-4 border-black px-5 py-3 flex items-center justify-center gap-3"
          style={{ backgroundColor: "var(--retro-green)", boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}>
          <Users className="w-5 h-5 text-black" />
          <span className="font-black text-black text-sm md:text-base">
            🎉 {preorderCount ?? 216} Bobby déjà réservé{(preorderCount ?? 216) > 1 ? "s" : ""} sur 10 000 — Édition limitée !
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">

        {/* ── HERO ── */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <img 
              src="/images/bobby-box.jpg" 
              alt="Bobby dans sa boîte avec coque chat" 
              className="w-full border-4 border-black rounded-lg"
              style={{ boxShadow: "6px 6px 0 rgba(0,0,0,0.2)" }}
            />
          </div>
          <div className="text-center md:text-left space-y-5">
            <RetroTag bg="var(--retro-red)">Précommande ouverte</RetroTag>
            <h1 className="text-3xl md:text-5xl font-black text-black">Précommandez Bobby</h1>
            <p className="text-sm md:text-base font-black text-black/70 max-w-xl">
              Soyez parmi les premiers à recevoir Bobby. Livraison Q3 2026.
            </p>
            <div className="flex items-center justify-center md:justify-start gap-6 pt-2">
              <div className="text-center">
                <p className="text-3xl font-black text-black line-through opacity-30">129€</p>
                <p className="text-[10px] font-black text-black/50">Prix public</p>
              </div>
              <div className="border-4 border-black bg-white px-8 py-4" style={{ boxShadow: "6px 6px 0 rgba(0,0,0,0.2)" }}>
                <p className="text-5xl font-black text-black">89€</p>
                <p className="text-[10px] font-black text-black">Précommande</p>
              </div>
            </div>
            <RetroButton onClick={() => document.getElementById("preorder-form")?.scrollIntoView({ behavior: "smooth" })} variant="primary" size="lg">
              <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Précommander — 89€</span>
            </RetroButton>
            <p className="text-[10px] font-black text-black/50">🔒 Paiement sécurisé • Livraison gratuite • Satisfait ou remboursé 30 jours</p>
          </div>
        </div>

        {/* ── CONTENU DU PACK ── */}
        <RetroSection bg="var(--retro-blue)">
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-2xl font-black text-black">📦 Contenu du pack</h2>
            <p className="text-xs font-black text-black/60">Tout ce dont votre enfant a besoin pour démarrer</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Bobby Device", desc: "Le compagnon IA", bg: "var(--retro-yellow)", img: "/images/bobby-device.png" },
              { label: "Coque Chat", desc: "Silicone premium incluse", bg: "var(--retro-green)", img: "/images/cases/chat.png" },
              { label: "Câble USB-C", desc: "Charge rapide", bg: "var(--retro-purple)", img: "/images/usbc-cable.png" },
              { label: "Guide démarrage", desc: "QR + setup parent", bg: "var(--retro-red)", img: null },
            ].map(item => (
              <div key={item.label} className="border-3 border-black p-4 text-center" style={{ borderWidth: "3px", backgroundColor: item.bg }}>
                {item.img ? (
                  <img src={item.img} alt={item.label} className="w-32 h-32 mx-auto object-contain mb-2 rounded-lg" />
                ) : (
                  <span className="text-3xl block mb-2">📖</span>
                )}
                <p className="text-xs font-black text-black">{item.label}</p>
                <p className="text-[9px] font-black text-black/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* ── PRIX ── */}
        <div className="grid md:grid-cols-2 gap-4">
          <RetroSection bg="var(--retro-green)" className="text-center">
            <img src="/images/bobby-device.png" alt="Bobby Device" className="w-44 h-44 mx-auto object-contain mb-3 rounded-xl" />
            <h3 className="text-lg font-black text-black">Bobby — Appareil seul</h3>
            <p className="text-[10px] font-black text-black/60 mb-3">Device + coque chat incluse + câble USB-C</p>
            <div className="border-3 border-black bg-white inline-block px-6 py-3" style={{ borderWidth: "3px", boxShadow: "4px 4px 0 rgba(0,0,0,0.15)" }}>
              <p className="text-3xl font-black text-black">89€</p>
              <p className="text-[9px] font-black text-black/50">Précommande</p>
            </div>
          </RetroSection>
          <RetroSection bg="var(--retro-purple)" className="text-center">
            <img src="/images/cases/chat.png" alt="Coque silicone" className="w-44 h-44 mx-auto object-contain mb-3 rounded-xl" />
            <h3 className="text-lg font-black text-black">Coque silicone seule</h3>
            <p className="text-[10px] font-black text-black/60 mb-3">Compatible tous Bobby — silicone alimentaire CE</p>
            <div className="border-3 border-black bg-white inline-block px-6 py-3" style={{ borderWidth: "3px", boxShadow: "4px 4px 0 rgba(0,0,0,0.15)" }}>
              <p className="text-3xl font-black text-black">14.99€</p>
              <p className="text-[9px] font-black text-black/50">Par coque</p>
            </div>
          </RetroSection>
        </div>

        {/* ── COQUES SILICONE ── */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-black text-black">🎨 Coques silicone Bobby</h2>
            <p className="text-xs font-black text-black/60 mt-1">Interchangeables, lavables, certifiées CE — silicone alimentaire</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SILICONE_CASES.map(c => (
              <RetroSection key={c.name} bg="#fff" className="relative hover:translate-y-[-2px] transition-transform">
                {c.included && (
                  <div className="absolute -top-3 right-3">
                    <RetroTag bg="var(--retro-green)">Incluse</RetroTag>
                  </div>
                )}
                <div className="text-center space-y-3">
                  <div className="mx-auto rounded-2xl border-3 border-black p-3 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" 
                    style={{ borderWidth: "3px", backgroundColor: c.color + "30" }}
                    onClick={() => setLightbox({ img: c.img, name: c.name })}>
                    <img src={c.img} alt={c.name} className="w-40 h-40 object-contain rounded-lg pointer-events-none" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-black">{c.name}</p>
                    <p className="text-[10px] font-black text-black/60">{c.desc}</p>
                  </div>
                  <div className="border-2 border-black bg-black text-white px-3 py-1.5 inline-block">
                    <span className="font-black text-sm">{c.included ? "Incluse" : c.price}</span>
                  </div>
                </div>
              </RetroSection>
            ))}
          </div>
        </div>

        {/* ── CARACTÉRISTIQUES ── */}
        <RetroSection bg="var(--retro-yellow)">
          <h2 className="text-xl md:text-2xl font-black text-black text-center mb-6">⚙️ Caractéristiques</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Écran LCD", desc: "1.28\" rond IPS", bg: "var(--retro-blue)" },
              { label: "Batterie", desc: "8h d'autonomie", bg: "var(--retro-green)" },
              { label: "Connectivité", desc: "Wi-Fi + Bluetooth", bg: "var(--retro-purple)" },
              { label: "Charge", desc: "USB-C rapide", bg: "var(--retro-red)" },
              { label: "Audio", desc: "Haut-parleur HD 3W", bg: "var(--retro-green)" },
              { label: "Micro", desc: "Double micro", bg: "var(--retro-blue)" },
              { label: "Sécurité", desc: "CE certifié", bg: "var(--retro-yellow)" },
              { label: "Âge", desc: "3-12 ans", bg: "var(--retro-purple)" },
            ].map((spec, i) => (
              <div key={i} className="border-3 border-black p-3 text-center bg-white" style={{ borderWidth: "3px", boxShadow: "3px 3px 0 rgba(0,0,0,0.1)" }}>
                <p className="text-sm font-black text-black">{spec.label}</p>
                <p className="text-[10px] font-black text-black/60">{spec.desc}</p>
              </div>
            ))}
          </div>
        </RetroSection>

        {/* ── FORMULAIRE PRÉCOMMANDE ── */}
        <RetroSection bg="#000" className="scroll-mt-20" id="preorder-form">
          {submitted ? (
            <div className="text-center space-y-4 py-6">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <h2 className="text-2xl md:text-3xl font-black text-white">Merci {formData.firstName} !</h2>
              <p className="text-sm font-black text-white/70 max-w-lg mx-auto">
                Votre précommande est enregistrée. Vous recevrez un email de confirmation avec les prochaines étapes.
              </p>
              <p className="text-[10px] font-black text-white/40">Livraison prévue Q3 2026</p>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-5">
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-black text-white">Précommandez Bobby</h2>
                <p className="text-sm font-black text-white/70">
                  Réservez votre Bobby dès maintenant — aucun paiement requis. Vous serez contacté pour finaliser votre commande.
                </p>
              </div>
              <form onSubmit={handlePreorder} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-white/60 uppercase mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="Votre prénom"
                    className="w-full px-4 py-3 border-3 border-white bg-white/10 text-white font-black text-sm placeholder:text-white/30 focus:outline-none focus:bg-white/20 transition-colors"
                    style={{ borderWidth: "3px" }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/60 uppercase mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="votre@email.com"
                    className="w-full px-4 py-3 border-3 border-white bg-white/10 text-white font-black text-sm placeholder:text-white/30 focus:outline-none focus:bg-white/20 transition-colors"
                    style={{ borderWidth: "3px" }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/60 uppercase mb-1">Téléphone (optionnel)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full px-4 py-3 border-3 border-white bg-white/10 text-white font-black text-sm placeholder:text-white/30 focus:outline-none focus:bg-white/20 transition-colors"
                    style={{ borderWidth: "3px" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 px-8 font-black uppercase text-base border-3 border-white bg-white text-black hover:bg-gray-100 transition-all hover:translate-y-[-2px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ borderWidth: "3px", boxShadow: "4px 4px 0px rgba(255,255,255,0.25)" }}
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours...</>
                  ) : (
                    <><ShoppingCart className="w-5 h-5" /> Réserver ma précommande — 89€</>
                  )}
                </button>
              </form>
              <p className="text-[10px] font-black text-white/40 text-center">
                🔒 Aucun paiement maintenant • Livraison Q3 2026 • Annulation gratuite
              </p>
            </div>
          )}
        </RetroSection>
      </div>

      {/* FOOTER */}
      <footer className="border-t-4 border-black bg-black text-white py-6 mt-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-[10px] font-black text-white/50">© 2026 Bobby — Tous droits réservés</p>
        </div>
      </footer>

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <div className="relative bg-white border-4 border-black rounded-2xl p-4 max-w-lg w-[90vw]" 
            style={{ boxShadow: "8px 8px 0 rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute -top-3 -right-3 bg-black text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-white hover:bg-gray-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <img src={lightbox.img} alt={lightbox.name} className="w-full object-contain rounded-xl max-h-[70vh]" />
            <p className="text-center font-black text-black text-sm mt-3">{lightbox.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
