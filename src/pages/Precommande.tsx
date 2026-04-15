import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, Cpu, Camera, Speaker, Monitor, Wifi, Battery, CircuitBoard, Shield, X } from "lucide-react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RETRO UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RetroSection = ({ children, bg = "#fff", className = "" }: { children: React.ReactNode; bg?: string; className?: string }) => (
  <section className={`border-4 border-black p-5 md:p-8 ${className}`}
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SILICONE_CASES = [
  { name: "Bobby Chat", emoji: "🐱", color: "#D4A574", desc: "Coque chat en silicone premium", salePrice: "14.99€", prodCost: "2.80€", included: true, img: "/images/cases/chat.png" },
  { name: "Bobby Panda", emoji: "🐼", color: "#2D2D2D", desc: "Coque panda noir & blanc", salePrice: "14.99€", prodCost: "2.80€", included: false, img: "/images/cases/panda.png" },
  { name: "Bobby Ourson", emoji: "🧸", color: "#C8A06A", desc: "Coque ourson miel chaleureux", salePrice: "14.99€", prodCost: "2.80€", included: false, img: "/images/cases/ourson.png" },
  { name: "Bobby Lapin", emoji: "🐰", color: "#E0E0E0", desc: "Coque lapin blanc doux", salePrice: "14.99€", prodCost: "2.80€", included: false, img: "/images/cases/lapin.png" },
];

const DEVICE_COMPONENTS = [
  { icon: Cpu, name: "ESP32-S3 SoC", desc: "Dual-core 240MHz, 16MB Flash, 8MB PSRAM, NPU intégré", cost: "2.80€", bg: "var(--retro-blue)" },
  { icon: Camera, name: "Caméra OV2640", desc: "2MP, reconnaissance faciale, détection de présence", cost: "1.50€", bg: "var(--retro-purple)" },
  { icon: Speaker, name: "Haut-parleur 3W", desc: "Ampli classe D, qualité audio HD enfant", cost: "1.30€", bg: "var(--retro-green)" },
  { icon: Monitor, name: "Écran LCD IPS 1.28\"", desc: "240×240px rond, SPI 40MHz, 65K couleurs", cost: "2.10€", bg: "var(--retro-yellow)" },
  { icon: CircuitBoard, name: "PCB 4 couches", desc: "FR4 1.6mm, composants CMS, test AOI automatisé", cost: "1.40€", bg: "var(--retro-red)" },
  { icon: Wifi, name: "Antenne Wi-Fi/BLE", desc: "802.11 b/g/n 2.4GHz + Bluetooth 5.0 LE", cost: "0.35€", bg: "var(--retro-blue)" },
  { icon: Battery, name: "Batterie Li-ion 3000mAh", desc: "8h autonomie active, USB-C charge rapide", cost: "3.00€", bg: "var(--retro-green)" },
  { icon: Shield, name: "2× Microphones MEMS", desc: "Réduction de bruit, I²S 24-bit", cost: "1.05€", bg: "var(--retro-purple)" },
];

// Total BOM: 13.50€
const DEVICE_COST = {
  bom: 13.50,
  assembly: 3.00,
  packaging: 1.50,
  testing: 0.80,
  shipping: 2.20,
  totalDevice: 21.00,
  deviceSalePrice: 89,
};

const CASE_COST = {
  mouldAmortized: 0.30,
  silicone: 1.80,
  paint: 0.40,
  packaging: 0.30,
  totalCase: 2.80,
  caseSalePrice: 14.99,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function Precommande() {
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<{ img: string; name: string } | null>(null);
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC" }}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b-4 border-black px-4 py-3" style={{ backgroundColor: "#FDF6EC" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-black text-black text-sm uppercase hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <span className="font-black text-black text-lg tracking-tight">BOBBY</span>
          <RetroTag bg="var(--retro-red)">🚀 Q3 2026</RetroTag>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">

        {/* ── HERO — PHOTO LEFT + PRICING RIGHT ── */}
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
            <RetroButton onClick={() => {}} variant="primary" size="lg">
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

        {/* ── PRIX — APPAREIL SEUL vs COQUE SEULE ── */}
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
                    <span className="font-black text-sm">{c.included ? "Incluse" : c.salePrice}</span>
                  </div>
                </div>
              </RetroSection>
            ))}
          </div>
        </div>

        {/* ── TECHNOLOGIE INSIDE ── */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-black text-black">⚙️ Technologie inside</h2>
            <p className="text-xs font-black text-black/60 mt-1">Composants de qualité professionnelle</p>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {DEVICE_COMPONENTS.map(comp => (
              <RetroSection key={comp.name} bg="#fff" className="hover:translate-y-[-1px] transition-transform">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-3 border-black flex items-center justify-center shrink-0" 
                    style={{ borderWidth: "3px", backgroundColor: comp.bg }}>
                    <comp.icon className="w-6 h-6 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-black">{comp.name}</p>
                      <span className="text-xs font-black text-black/40 shrink-0 ml-2">{comp.cost}</span>
                    </div>
                    <p className="text-[10px] font-black text-black/60 leading-relaxed">{comp.desc}</p>
                  </div>
                </div>
              </RetroSection>
            ))}
          </div>
        </div>

        {/* ── BUSINESS PLAN — DEVICE ── */}
        <RetroSection bg="var(--retro-yellow)">
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-2xl font-black text-black">📊 Business Plan — Appareil Bobby</h2>
            <p className="text-xs font-black text-black/60">Transparence totale sur les coûts de production</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-black uppercase mb-3">💰 Coûts de production (par unité)</h3>
              {[
                { label: "Composants électroniques (BOM)", value: `${DEVICE_COST.bom}€`, bar: (DEVICE_COST.bom / DEVICE_COST.totalDevice) * 100, color: "var(--retro-blue)" },
                { label: "Assemblage & soudure SMT", value: `${DEVICE_COST.assembly}€`, bar: (DEVICE_COST.assembly / DEVICE_COST.totalDevice) * 100, color: "var(--retro-purple)" },
                { label: "Packaging & documentation", value: `${DEVICE_COST.packaging}€`, bar: (DEVICE_COST.packaging / DEVICE_COST.totalDevice) * 100, color: "var(--retro-green)" },
                { label: "Tests qualité & certification CE", value: `${DEVICE_COST.testing}€`, bar: (DEVICE_COST.testing / DEVICE_COST.totalDevice) * 100, color: "var(--retro-red)" },
                { label: "Logistique & expédition", value: `${DEVICE_COST.shipping}€`, bar: (DEVICE_COST.shipping / DEVICE_COST.totalDevice) * 100, color: "var(--retro-yellow)" },
              ].map(item => (
                <div key={item.label} className="border-2 border-black bg-white p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-black">{item.label}</span>
                    <span className="text-xs font-black text-black">{item.value}</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/10 border border-black">
                    <div className="h-full" style={{ width: `${item.bar}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
              <div className="border-3 border-black bg-black text-white p-3 mt-3" style={{ borderWidth: "3px" }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black">TOTAL PRODUCTION</span>
                  <span className="text-lg font-black">{DEVICE_COST.totalDevice}€</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-black text-black uppercase mb-3">📈 Répartition du prix de vente</h3>
              <div className="border-3 border-black bg-white p-5 text-center space-y-4" style={{ borderWidth: "3px" }}>
                <div>
                  <p className="text-[10px] font-black text-black/50 uppercase">Prix précommande</p>
                  <p className="text-5xl font-black text-black">89€</p>
                </div>
                <div className="w-full h-8 border-2 border-black overflow-hidden flex rounded">
                  <div className="h-full bg-black flex items-center justify-center" style={{ width: `${(DEVICE_COST.totalDevice / DEVICE_COST.deviceSalePrice) * 100}%` }}>
                    <span className="text-[8px] font-black text-white">Production</span>
                  </div>
                  <div className="h-full flex items-center justify-center" style={{ width: `${((DEVICE_COST.deviceSalePrice - DEVICE_COST.totalDevice) / DEVICE_COST.deviceSalePrice) * 100}%`, backgroundColor: "var(--retro-green)" }}>
                    <span className="text-[8px] font-black text-black">R&D + Cloud + Support</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="border-2 border-black p-2">
                    <p className="text-[9px] font-black text-black/50">Production</p>
                    <p className="text-sm font-black text-black">{DEVICE_COST.totalDevice}€ <span className="text-[9px] text-black/40">({Math.round((DEVICE_COST.totalDevice / DEVICE_COST.deviceSalePrice) * 100)}%)</span></p>
                  </div>
                  <div className="border-2 border-black p-2" style={{ backgroundColor: "var(--retro-green)" }}>
                    <p className="text-[9px] font-black text-black/50">R&D, Cloud, Support</p>
                    <p className="text-sm font-black text-black">{DEVICE_COST.deviceSalePrice - DEVICE_COST.totalDevice}€ <span className="text-[9px] text-black/40">({Math.round(((DEVICE_COST.deviceSalePrice - DEVICE_COST.totalDevice) / DEVICE_COST.deviceSalePrice) * 100)}%)</span></p>
                  </div>
                </div>
                <p className="text-[9px] font-black text-black/40">
                  La marge finance le développement logiciel, l'infrastructure cloud, les mises à jour et le support technique.
                </p>
              </div>
              {/* Comparatif */}
              <div className="border-3 border-black bg-white p-4" style={{ borderWidth: "3px" }}>
                <p className="text-[10px] font-black text-black/50 uppercase mb-2">Comparatif marché</p>
                {[
                  { name: "Bobby (précommande)", price: "89€", highlight: true },
                  { name: "Bobby (prix public)", price: "129€", highlight: false },
                  { name: "Tonies® Toniebox", price: "99€", highlight: false },
                  { name: "Amazon Echo Dot Kids", price: "69€", highlight: false },
                  { name: "Miko 3 Robot", price: "249€", highlight: false },
                ].map(item => (
                  <div key={item.name} className={`flex justify-between items-center py-1.5 border-b border-black/10 last:border-0 ${item.highlight ? "bg-black text-white px-2 -mx-2 border-0" : ""}`}>
                    <span className={`text-[10px] font-black ${item.highlight ? "text-white" : "text-black"}`}>{item.name}</span>
                    <span className={`text-xs font-black ${item.highlight ? "text-white" : "text-black"}`}>{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RetroSection>

        {/* ── BUSINESS PLAN — COQUE SILICONE ── */}
        <RetroSection bg="var(--retro-purple)">
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-2xl font-black text-black">🎨 Business Plan — Coque Silicone</h2>
            <p className="text-xs font-black text-black/60">Accessoire à forte marge, moteur de récurrence</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-black uppercase mb-3">💰 Coûts de production (par coque)</h3>
              {[
                { label: "Silicone alimentaire", value: `${CASE_COST.silicone}€`, bar: (CASE_COST.silicone / CASE_COST.totalCase) * 100, color: "var(--retro-green)" },
                { label: "Peinture & finition", value: `${CASE_COST.paint}€`, bar: (CASE_COST.paint / CASE_COST.totalCase) * 100, color: "var(--retro-yellow)" },
                { label: "Moule amorti (10k unités)", value: `${CASE_COST.mouldAmortized}€`, bar: (CASE_COST.mouldAmortized / CASE_COST.totalCase) * 100, color: "var(--retro-blue)" },
                { label: "Packaging coque", value: `${CASE_COST.packaging}€`, bar: (CASE_COST.packaging / CASE_COST.totalCase) * 100, color: "var(--retro-red)" },
              ].map(item => (
                <div key={item.label} className="border-2 border-black bg-white p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-black">{item.label}</span>
                    <span className="text-xs font-black text-black">{item.value}</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/10 border border-black">
                    <div className="h-full" style={{ width: `${item.bar}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
              <div className="border-3 border-black bg-black text-white p-3 mt-3" style={{ borderWidth: "3px" }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black">TOTAL PRODUCTION</span>
                  <span className="text-lg font-black">{CASE_COST.totalCase}€</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-black text-black uppercase mb-3">📈 Marge par coque</h3>
              <div className="border-3 border-black bg-white p-5 text-center space-y-4" style={{ borderWidth: "3px" }}>
                <div>
                  <p className="text-[10px] font-black text-black/50 uppercase">Prix de vente</p>
                  <p className="text-5xl font-black text-black">14.99€</p>
                </div>
                <div className="w-full h-8 border-2 border-black overflow-hidden flex rounded">
                  <div className="h-full bg-black flex items-center justify-center" style={{ width: `${(CASE_COST.totalCase / CASE_COST.caseSalePrice) * 100}%` }}>
                    <span className="text-[8px] font-black text-white">Prod.</span>
                  </div>
                  <div className="h-full flex items-center justify-center" style={{ width: `${((CASE_COST.caseSalePrice - CASE_COST.totalCase) / CASE_COST.caseSalePrice) * 100}%`, backgroundColor: "var(--retro-green)" }}>
                    <span className="text-[8px] font-black text-black">Marge brute</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="border-2 border-black p-3">
                    <p className="text-[9px] font-black text-black/50">Production</p>
                    <p className="text-lg font-black text-black">{CASE_COST.totalCase}€</p>
                  </div>
                  <div className="border-2 border-black p-3" style={{ backgroundColor: "var(--retro-green)" }}>
                    <p className="text-[9px] font-black text-black/50">Marge brute</p>
                    <p className="text-lg font-black text-black">{(CASE_COST.caseSalePrice - CASE_COST.totalCase).toFixed(2)}€</p>
                    <p className="text-[9px] font-black text-black/40">({Math.round(((CASE_COST.caseSalePrice - CASE_COST.totalCase) / CASE_COST.caseSalePrice) * 100)}%)</p>
                  </div>
                </div>
                <div className="border-2 border-black p-3 text-left" style={{ backgroundColor: "var(--retro-yellow)" }}>
                  <p className="text-[9px] font-black text-black/50 uppercase">Projection 10k coques vendues</p>
                  <p className="text-lg font-black text-black">{((CASE_COST.caseSalePrice - CASE_COST.totalCase) * 10000).toLocaleString("fr-FR")}€ <span className="text-[9px] text-black/40">de marge brute</span></p>
                </div>
              </div>
            </div>
          </div>
        </RetroSection>

        {/* ── ROADMAP 12 MOIS ── */}
        <RetroSection bg="#fff">
          <h2 className="text-xl md:text-2xl font-black text-black text-center mb-6">🗓️ Roadmap Bobby — 12 mois</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { q: "T1", month: "Mois 1-3", bg: "var(--retro-blue)", items: [
                "🧪 Version Bêta prête",
                "👨‍👩‍👧 200-500 familles testeurs",
                "🐛 Corrections & optimisations",
                "📊 Dashboard analytics interne",
              ]},
              { q: "T2", month: "Mois 4-6", bg: "var(--retro-green)", items: [
                "📱 App Store & Play Store",
                "👪 Dashboard Parent public",
                "📚 +200 contenus Bobby Store",
                "🔄 Auto-learning hebdomadaire",
              ]},
              { q: "T3", month: "Mois 7-9", bg: "var(--retro-purple)", items: [
                "🌍 Multi-langues (EN, ES, DE…)",
                "🤝 Collabs coques licences",
                "🎬 Micro dessins animés & vidéos",
                "🧠 IA contextuelle avancée",
              ]},
              { q: "T4", month: "Mois 10-12", bg: "var(--retro-yellow)", items: [
                "🏬 Grande & moyenne surface",
                "📦 Packs cadeaux saisonniers",
                "🎮 Nouveaux jeux éducatifs",
                "🔐 Certifications RGPD / COPPA",
              ]},
            ].map((phase, i) => (
              <div key={i} className="border-3 border-black p-3 flex flex-col gap-2" style={{ borderWidth: "3px", backgroundColor: phase.bg, boxShadow: "4px 4px 0px rgba(0,0,0,0.2)" }}>
                <div className="flex items-center gap-2">
                  <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 uppercase">{phase.q}</span>
                  <span className="text-[10px] font-black text-black/60">{phase.month}</span>
                </div>
                <ul className="space-y-1">
                  {phase.items.map((item, j) => (
                    <li key={j} className="text-[11px] font-bold text-black leading-tight">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "En continu", bg: "var(--retro-red)", items: ["🔄 MAJ logiciel auto chaque semaine", "🧠 Auto-learning permanent", "🛡️ Audits sécurité mensuels", "📈 Analyse feedback parents"] },
            ].map((block, i) => (
              <div key={i} className="col-span-2 md:col-span-4 border-3 border-black p-3 flex flex-wrap gap-3 items-center justify-center" style={{ borderWidth: "3px", backgroundColor: block.bg, boxShadow: "4px 4px 0px rgba(0,0,0,0.2)" }}>
                <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 uppercase">{block.label}</span>
                {block.items.map((item, j) => (
                  <span key={j} className="text-[11px] font-bold text-black bg-white/50 px-2 py-1 border border-black/20">{item}</span>
                ))}
              </div>
            ))}
          </div>
        </RetroSection>

        {/* ── CTA FINAL ── */}
        <RetroSection bg="#000">
          <div className="text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-white">Prêt à offrir Bobby ?</h2>
            <p className="text-sm font-black text-white/70 max-w-lg mx-auto">
              Rejoignez les premiers parents à recevoir le compagnon IA le plus avancé pour enfants.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <RetroButton onClick={() => {}} variant="secondary" size="lg">
                <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Précommander — 89€</span>
              </RetroButton>
            </div>
            <p className="text-[10px] font-black text-white/40">
              🔒 Paiement sécurisé • Livraison gratuite France • Satisfait ou remboursé 30 jours
            </p>
          </div>
        </RetroSection>
      </div>

      {/* FOOTER */}
      <footer className="border-t-4 border-black bg-black text-white py-6 mt-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-[10px] font-black text-white/50">© 2026 OSAI × Silverlit — Bobby™ est une marque déposée</p>
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
