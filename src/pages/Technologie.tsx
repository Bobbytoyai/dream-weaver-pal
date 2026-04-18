import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cpu, Mic, Eye, Zap, Shield, Wifi, Battery, Volume2 } from "lucide-react";
import RetroMobileNav from "@/components/RetroMobileNav";

/* ============================================================
   BOBBY • TECHNOLOGIE
   Scroll-scrubbed exploded video (Apple-style) + Retro DA
   ============================================================ */

const RetroTag = ({ children, bg = "#FDE68A" }: { children: React.ReactNode; bg?: string }) => (
  <span
    className="inline-block px-3 py-1 text-[10px] font-black uppercase border-2 border-black text-black tracking-wider"
    style={{ backgroundColor: bg }}
  >
    {children}
  </span>
);

const RetroCard = ({
  children,
  bg = "#FFFFFF",
  className = "",
}: {
  children: React.ReactNode;
  bg?: string;
  className?: string;
}) => (
  <div
    className={`border-4 border-black p-6 md:p-8 ${className}`}
    style={{ backgroundColor: bg, boxShadow: "8px 8px 0px rgba(0,0,0,0.85)" }}
  >
    {children}
  </div>
);

/* ----- Scroll-driven video scrubber (Apple AirPods style) ----- */
const useScrollVideoScrub = (videoRef: React.RefObject<HTMLVideoElement>, sectionRef: React.RefObject<HTMLElement>) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    let duration = 0;
    let raf = 0;

    const onLoaded = () => {
      duration = video.duration || 0;
    };
    video.addEventListener("loadedmetadata", onLoaded);
    if (video.readyState >= 1) onLoaded();

    const update = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = total > 0 ? scrolled / total : 0;
      setProgress(p);
      if (duration > 0) {
        const target = p * duration;
        // Smooth seeking
        if (Math.abs(video.currentTime - target) > 0.03) {
          try {
            video.currentTime = target;
          } catch {}
        }
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      video.removeEventListener("loadedmetadata", onLoaded);
      cancelAnimationFrame(raf);
    };
  }, [videoRef, sectionRef]);

  return progress;
};

/* ----- Diagram callout pin with connector line (épuré) ----- */
const Pin = ({
  n,
  label,
  sub,
  x,
  y,
  show,
  align = "right",
  lineLength = 80,
}: {
  n: number;
  label: string;
  sub?: string;
  x: string;
  y: string;
  show: boolean;
  align?: "left" | "right";
  lineLength?: number;
}) => (
  <div
    className="absolute z-20 transition-all duration-500 ease-out pointer-events-none"
    style={{
      left: x,
      top: y,
      opacity: show ? 1 : 0,
    }}
  >
    {/* Connector line + dot anchor */}
    <div
      className="absolute top-1/2 h-[2px] bg-black"
      style={{
        width: `${lineLength}px`,
        [align === "left" ? "right" : "left"]: "0",
        transform: "translateY(-50%)",
        transformOrigin: align === "left" ? "right center" : "left center",
        transition: "transform 0.6s ease-out",
        transformBox: "fill-box",
      }}
    />
    <div
      className="absolute top-1/2 w-2 h-2 rounded-full bg-black border-2 border-black"
      style={{
        [align === "left" ? "right" : "left"]: "-4px",
        transform: "translateY(-50%)",
      }}
    />
    {/* Label box, offset by line length */}
    <div
      className="absolute top-1/2 flex items-center gap-2"
      style={{
        [align === "left" ? "right" : "left"]: `${lineLength + 6}px`,
        transform: `translateY(-50%) scale(${show ? 1 : 0.9})`,
        flexDirection: align === "left" ? "row-reverse" : "row",
        transition: "transform 0.5s ease-out",
      }}
    >
      <div
        className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center font-black text-black text-xs shrink-0 bg-white"
      >
        {n}
      </div>
      <div className="leading-tight whitespace-nowrap">
        <div className="font-black text-black text-xs uppercase">{label}</div>
        {sub && <div className="text-[10px] font-bold text-black/50">{sub}</div>}
      </div>
    </div>
  </div>
);

/* ----- Spec stat ----- */
const Spec = ({ icon: Icon, label, value, bg }: { icon: any; label: string; value: string; bg: string }) => (
  <div
    className="border-4 border-black p-4 flex flex-col gap-2"
    style={{ backgroundColor: bg, boxShadow: "5px 5px 0 rgba(0,0,0,0.85)" }}
  >
    <Icon className="w-6 h-6 text-black" strokeWidth={3} />
    <div className="text-[10px] font-black uppercase text-black/60 tracking-wider">{label}</div>
    <div className="font-black text-black text-lg leading-tight">{value}</div>
  </div>
);

const Technologie = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubRef = useRef<HTMLElement>(null);
  const progress = useScrollVideoScrub(videoRef, scrubRef);

  // Reveal pins progressively
  const showPin = (threshold: number) => progress > threshold;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Sticky retro nav */}
      <nav className="sticky top-0 z-50 border-b-4 border-black px-4 py-3" style={{ backgroundColor: "#FDF6EC" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RetroMobileNav />
            <button
              onClick={() => navigate("/")}
              className="hidden md:flex items-center gap-2 font-black text-black text-sm uppercase hover:opacity-70"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
          </div>
          <span className="font-black text-black text-lg tracking-tight">BOBBY</span>
          <RetroTag bg="#C084FC">Technologie</RetroTag>
        </div>
      </nav>

      {/* HERO INTRO */}
      <section className="max-w-5xl mx-auto px-4 pt-12 pb-8 text-center space-y-5">
        <div className="flex justify-center gap-2 flex-wrap">
          <RetroTag bg="#C084FC">OSAÏ V9</RetroTag>
          <RetroTag bg="#86EFAC">Made in France</RetroTag>
          <RetroTag bg="#FDE68A">Édition Silverlit</RetroTag>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-black leading-[0.95] tracking-tight">
          Sous le capot
          <br />
          <span
            className="inline-block border-4 border-black px-4 py-1 mt-3"
            style={{ backgroundColor: "#C084FC", boxShadow: "8px 8px 0 rgba(0,0,0,0.85)" }}
          >
            de Bobby
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-base md:text-lg font-bold text-black/70 leading-relaxed">
          Une sphère de 67mm. Onze composants. Un cerveau propriétaire.
          <br />
          <span className="text-black">Faites défiler pour ouvrir l'appareil.</span>
        </p>
        <div className="pt-4 animate-bounce">
          <div className="inline-block border-4 border-black px-3 py-1 font-black text-xs uppercase bg-white">
            ↓ Scroll
          </div>
        </div>
      </section>

      {/* SCROLL-SCRUB SECTION (tall — drives video) */}
      <section ref={scrubRef} className="relative" style={{ height: "400vh" }}>
        <div className="sticky top-0 h-screen w-full overflow-hidden" style={{ backgroundColor: "#FDF6EC" }}>
          {/* Faint engineering grid background */}
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Video stage */}
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              src="/videos/bobby-exploded.mp4"
              className="w-full h-full object-contain"
              muted
              playsInline
              preload="auto"
              // Critical: disable autoplay so we control via currentTime
            />

            {/* Pins épurés avec lignes — séquencés selon l'ouverture du device */}
            {/* 1. Coque ABS : visible uniquement avant l'ouverture (0.05 → 0.22) */}
            <Pin n={1} label="Coque ABS" sub="Ø 67 mm" x="22%" y="38%" show={progress > 0.05 && progress < 0.22} align="left" lineLength={70} />
            {/* 2. Haut-parleur : apparaît quand la coque s'ouvre (0.22) */}
            <Pin n={2} label="Haut-parleur" sub="28mm · 3W" x="30%" y="58%" show={showPin(0.22)} align="left" lineLength={90} />
            {/* 3. USB-C : juste après le haut-parleur */}
            <Pin n={3} label="USB-C" sub="Charge latérale" x="60%" y="88%" show={showPin(0.3)} lineLength={80} />
            {/* 4. Micro */}
            <Pin n={4} label="Micro INMP441" sub="I2S MEMS" x="46%" y="32%" show={showPin(0.42)} align="left" lineLength={100} />
            {/* 5. Caméra (ralentie) */}
            <Pin n={5} label="Caméra OV2640" sub="2 MP" x="68%" y="28%" show={showPin(0.62)} lineLength={90} />
            {/* 6. OSAÏ V9 (ralentie — révélation centrale) */}
            <Pin n={6} label="OSAÏ V9" sub="MCU Silverlit" x="50%" y="50%" show={showPin(0.55)} lineLength={120} />
            {/* 7. Pogo pins */}
            <Pin n={7} label="Pogo Pins" sub="5P · 2.54mm" x="50%" y="72%" show={showPin(0.72)} lineLength={80} />
            {/* 8. Batterie dans le socle */}
            <Pin n={8} label="Batterie" sub="LiPo 1500mAh" x="42%" y="86%" show={showPin(0.8)} align="left" lineLength={90} />
            {/* 9. LCD : à la fin, lors de la refermeture */}
            <Pin n={9} label="Écran GC9A01" sub='1.28" IPS' x="72%" y="50%" show={showPin(0.9)} lineLength={100} />
          </div>

          {/* Progress indicator (top right) */}
          <div className="absolute top-4 right-4 z-30 border-4 border-black bg-white px-3 py-2 font-black text-xs uppercase"
               style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.85)" }}>
            <div className="flex items-center gap-2">
              <span className="text-black/50">VUE ÉCLATÉE</span>
              <span className="tabular-nums">{Math.round(progress * 100).toString().padStart(2, "0")}%</span>
            </div>
            <div className="mt-1.5 h-2 w-32 border-2 border-black bg-[#FDF6EC] overflow-hidden">
              <div className="h-full bg-black transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          {/* Stage label (bottom) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 text-center pointer-events-none">
            <div className="inline-block border-4 border-black bg-[#FDE68A] px-4 py-2 font-black text-sm uppercase tracking-wider"
                 style={{ boxShadow: "5px 5px 0 rgba(0,0,0,0.85)" }}>
              {progress < 0.25 && "01 · Sphère intacte"}
              {progress >= 0.25 && progress < 0.55 && "02 · Ouverture des coques"}
              {progress >= 0.55 && progress < 0.85 && "03 · OSAÏ V9 révélée"}
              {progress >= 0.85 && "04 · Architecture complète"}
            </div>
          </div>
        </div>
      </section>

      {/* CHIP HERO — OSAÏ V9 spotlight */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <RetroCard bg="#0A0A0A" className="!text-white">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <RetroTag bg="#FDE68A">Cœur du système</RetroTag>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                OSAÏ V9
                <br />
                <span className="text-[#FDE68A]">Silverlit Edition</span>
              </h2>
              <p className="font-bold text-white/70 leading-relaxed">
                Une puce propriétaire conçue par OSAI, embarquant un MCU dual-core 240 MHz, 8 Mo de PSRAM
                et un moteur de traitement vocal hybride local-cloud.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="border-2 border-white/40 p-3">
                  <div className="text-[10px] font-black uppercase text-white/50">Latence</div>
                  <div className="font-black text-white text-xl">&lt; 700 ms</div>
                </div>
                <div className="border-2 border-white/40 p-3">
                  <div className="text-[10px] font-black uppercase text-white/50">Offline</div>
                  <div className="font-black text-white text-xl">100% local</div>
                </div>
              </div>
            </div>
            {/* Chip visual */}
            <div className="relative aspect-square max-w-sm mx-auto">
              <div className="absolute inset-8 border-[6px] border-[#FDE68A] bg-[#1A1A1A] rounded-sm flex items-center justify-center"
                   style={{ boxShadow: "0 0 60px rgba(253, 230, 138, 0.4)" }}>
                <div className="text-center">
                  <div className="font-black text-[#FDE68A] text-3xl tracking-tight">OSAÏ</div>
                  <div className="font-black text-white text-5xl tracking-tighter">V9</div>
                  <div className="text-[9px] font-bold text-white/50 mt-2 tracking-widest">SILVERLIT</div>
                </div>
              </div>
              {/* Pins */}
              {[...Array(12)].map((_, i) => (
                <div key={i} className="absolute w-3 h-1 bg-[#FDE68A]"
                     style={{
                       left: `${10 + (i % 6) * 14}%`,
                       top: i < 6 ? "8%" : "auto",
                       bottom: i >= 6 ? "8%" : "auto",
                     }} />
              ))}
            </div>
          </div>
        </RetroCard>
      </section>

      {/* SPECS GRID */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="text-center mb-8">
          <RetroTag bg="#86EFAC">Spécifications</RetroTag>
          <h2 className="text-3xl md:text-4xl font-black text-black mt-3">Sous le capot.</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Spec icon={Cpu} label="Processeur" value="OSAÏ V9 · 240MHz" bg="#FDE68A" />
          <Spec icon={Mic} label="Micro" value="INMP441 I2S" bg="#86EFAC" />
          <Spec icon={Volume2} label="Audio" value="3W · MAX98357A" bg="#FCA5A5" />
          <Spec icon={Eye} label="Écran" value='1.28" 240×240' bg="#C084FC" />
          <Spec icon={Eye} label="Caméra" value="OV2640 2MP" bg="#93C5FD" />
          <Spec icon={Battery} label="Batterie" value="1500 mAh" bg="#FDE68A" />
          <Spec icon={Wifi} label="Connexion" value="Wi-Fi + BLE" bg="#86EFAC" />
          <Spec icon={Zap} label="Charge" value="USB-C 5V/2A" bg="#FCA5A5" />
        </div>
      </section>

      {/* DIAGRAM FLOW — Apple style data path */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <RetroTag bg="#C084FC">Flux de données</RetroTag>
          <h2 className="text-3xl md:text-4xl font-black text-black mt-3">De la voix à la réponse.</h2>
          <p className="font-bold text-black/60 mt-2">Pipeline complet en moins de 700ms.</p>
        </div>

        <div className="space-y-3">
          {[
            { n: "01", t: "Capture vocale", d: "Micro INMP441 → I2S → buffer 1800ms", c: "#FDE68A" },
            { n: "02", t: "Détection éveil", d: "Wake word local sur OSAÏ V9", c: "#86EFAC" },
            { n: "03", t: "Cerveau hybride", d: "Local Brain (offline) ou Gemini Flash (cloud)", c: "#C084FC" },
            { n: "04", t: "Synthèse vocale", d: "ElevenLabs streaming → MAX98357A", c: "#FCA5A5" },
            { n: "05", t: "Expression faciale", d: "GC9A01 SPI → animation hologramme", c: "#93C5FD" },
          ].map((step, i) => (
            <div key={step.n} className="flex items-stretch gap-3">
              <div
                className="w-16 md:w-20 shrink-0 border-4 border-black flex items-center justify-center font-black text-black text-xl"
                style={{ backgroundColor: step.c, boxShadow: "5px 5px 0 rgba(0,0,0,0.85)" }}
              >
                {step.n}
              </div>
              <div
                className="flex-1 border-4 border-black bg-white p-4"
                style={{ boxShadow: "5px 5px 0 rgba(0,0,0,0.85)" }}
              >
                <div className="font-black text-black uppercase">{step.t}</div>
                <div className="font-bold text-black/60 text-sm">{step.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECURITY FOOTER */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <RetroCard bg="#86EFAC">
          <div className="flex items-start gap-4">
            <Shield className="w-10 h-10 text-black shrink-0" strokeWidth={3} />
            <div>
              <div className="font-black text-black text-2xl mb-1">100% souverain.</div>
              <div className="font-bold text-black/80">
                Données chiffrées, traitement local prioritaire, conformité RGPD & COPPA.
                Aucune donnée enfant ne quitte l'appareil sans consentement parental explicite.
              </div>
            </div>
          </div>
        </RetroCard>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 pb-20 text-center">
        <button
          onClick={() => navigate("/precommande")}
          className="inline-block border-4 border-black bg-black text-white font-black uppercase px-8 py-4 text-lg hover:translate-x-1 hover:translate-y-1 transition-transform"
          style={{ boxShadow: "8px 8px 0 #C084FC" }}
        >
          Précommander Bobby →
        </button>
      </section>
    </div>
  );
};

export default Technologie;
