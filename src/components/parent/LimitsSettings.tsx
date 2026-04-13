import { useState } from "react";
import { ChevronLeft, Sun, X } from "lucide-react";
import type { ParentSettings } from "@/components/parentSettings";

interface LimitsSettingsProps {
  settings: ParentSettings;
  onUpdate: <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => void;
  onUpdateNested: (parent: string, key: string, value: any) => void;
  todayDuration: number;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!value)}
    className={`relative w-12 h-7 border-4 border-black transition-all duration-300 ${value ? "bg-foreground" : "bg-white"}`}>
    <div className={`w-4 h-4 bg-white border-2 border-black transition-all duration-300 ${value ? "translate-x-5 bg-[var(--retro-green)]" : "translate-x-0.5"}`} style={{ marginTop: "-2px" }} />
  </button>
);

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}min ${secs}s`;
};

const LimitsSettings = ({ settings, onUpdate, onUpdateNested, todayDuration, onBack, onSave, saved }: LimitsSettingsProps) => {
  const [newBlockedTopic, setNewBlockedTopic] = useState("");
  const limitMinutes = settings.timeLimitMinutes || 60;

  return (
    <div className="p-4 space-y-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] font-black uppercase text-foreground hover:opacity-70 mb-1 active:scale-95 transition-all border-2 border-black px-3 py-1.5 bg-white">
        <ChevronLeft className="w-4 h-4" /> RÉGLAGES
      </button>

      <h2 className="text-[18px] font-black text-foreground uppercase tracking-wide">⏱️ LIMITES & CONTRÔLE</h2>
      <p className="text-[12px] text-muted-foreground -mt-2 font-bold">
        Gardez le contrôle sur le temps et le contenu de Bobby
      </p>

      {/* Daily time limit */}
      <div className="retro-card retro-card-tilt-1 p-4" style={{ backgroundColor: "var(--retro-blue)" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">⏳</span>
          <h3 className="text-[14px] font-black text-foreground uppercase">LIMITE JOURNALIÈRE</h3>
          <span className="ml-auto text-[14px] font-black text-foreground border-2 border-black px-2 py-0.5 bg-white">{limitMinutes} min</span>
        </div>
        <input type="range" min="10" max="180" step="5" value={limitMinutes}
          onChange={(e) => onUpdate("timeLimitMinutes", Number(e.target.value))}
          className="w-full h-3 appearance-none bg-white border-2 border-black accent-foreground" />
        <div className="flex justify-between text-[9px] text-foreground/60 mt-1 font-black">
          <span>10 min</span><span>1h</span><span>2h</span><span>3h</span>
        </div>
        {todayDuration > 0 && (
          <div className="mt-3 pt-3 border-t-2 border-black/20">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] text-foreground/70 font-black uppercase">Utilisé aujourd'hui</span>
              <span className="text-[12px] font-mono font-black text-foreground border-2 border-black px-2 bg-white">{formatDuration(todayDuration)}</span>
            </div>
            <div className="w-full h-3 bg-white border-2 border-black overflow-hidden">
              <div className={`h-full transition-all ${todayDuration / 60 > limitMinutes ? "bg-[var(--retro-red)]" : "bg-foreground"}`}
                style={{ width: `${Math.min(100, (todayDuration / 60 / limitMinutes) * 100)}%` }} />
            </div>
            <p className="text-[9px] text-foreground/60 mt-1 font-black">
              {todayDuration / 60 > limitMinutes ? "⚠️ LIMITE DÉPASSÉE" : `${Math.round(limitMinutes - todayDuration / 60)} min restantes`}
            </p>
          </div>
        )}
      </div>

      {/* Auto stop + Night mode */}
      <div className="grid grid-cols-2 gap-2">
        <div className="retro-card retro-card-tilt-2 p-4" style={{ backgroundColor: "var(--retro-red)" }}>
          <span className="text-2xl block mb-2">🛑</span>
          <h4 className="text-[12px] font-black text-foreground mb-1 uppercase">ARRÊT AUTO</h4>
          <p className="text-[9px] text-foreground/60 mb-2 font-bold">Bobby s'arrête quand la limite est atteinte</p>
          <Toggle value={settings.autoStop} onChange={(v) => onUpdate("autoStop", v)} />
        </div>
        <div className="retro-card retro-card-tilt-3 p-4" style={{ backgroundColor: "var(--retro-purple)" }}>
          <span className="text-2xl block mb-2">🌙</span>
          <h4 className="text-[12px] font-black text-foreground mb-1 uppercase">MODE NUIT</h4>
          <p className="text-[9px] text-foreground/60 mb-2 font-bold">Bobby se met en veille automatiquement</p>
          <Toggle value={settings.nightMode.active} onChange={(v) => onUpdateNested("nightMode", "active", v)} />
        </div>
      </div>

      {/* Night mode hours */}
      {settings.nightMode.active && (
        <div className="retro-card retro-card-tilt-4 p-4" style={{ backgroundColor: "var(--retro-purple)" }}>
          <h4 className="text-[12px] font-black text-foreground mb-3 uppercase">🌙 PLAGE HORAIRE DE VEILLE</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-foreground/60 mb-1 font-black uppercase">Début (soir)</p>
              <input type="time" value={settings.nightMode.startHour}
                onChange={(e) => onUpdateNested("nightMode", "startHour", e.target.value)}
                className="w-full px-3 py-2 bg-white text-[13px] text-foreground font-bold border-4 border-black outline-none" />
            </div>
            <Sun className="w-4 h-4 text-foreground/40 mt-4" />
            <div className="flex-1">
              <p className="text-[10px] text-foreground/60 mb-1 font-black uppercase">Fin (matin)</p>
              <input type="time" value={settings.nightMode.endHour}
                onChange={(e) => onUpdateNested("nightMode", "endHour", e.target.value)}
                className="w-full px-3 py-2 bg-white text-[13px] text-foreground font-bold border-4 border-black outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* Interaction controls */}
      <div className="retro-card retro-card-tilt-5 p-4" style={{ backgroundColor: "var(--retro-yellow)" }}>
        <h3 className="text-[14px] font-black text-foreground mb-3 uppercase">👆 MODES D'INTERACTION</h3>
        {([
          ["wakeWord", "🎤", "Mot de réveil", "Bobby se réveille à la voix"],
          ["tap", "👆", "Toucher l'écran", "Activation par toucher"],
          ["interruption", "⚠️", "Interruption", "L'enfant peut couper Bobby"],
        ] as const).map(([key, emoji, label, desc]) => (
          <div key={key} className="flex items-center justify-between py-2.5 border-b-2 border-black/10 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-lg">{emoji}</span>
              <div>
                <span className="text-[12px] font-black text-foreground uppercase">{label}</span>
                <p className="text-[9px] text-foreground/60 font-bold">{desc}</p>
              </div>
            </div>
            <Toggle
              value={settings.interactions[key as keyof typeof settings.interactions]}
              onChange={(v) => onUpdateNested("interactions", key, v)}
            />
          </div>
        ))}
      </div>

      {/* Max message length */}
      <div className="retro-card retro-card-tilt-6 p-4" style={{ backgroundColor: "var(--retro-green)" }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-black text-foreground uppercase">📝 LONGUEUR MAX</h3>
          <span className="text-[12px] font-mono font-black text-foreground border-2 border-black px-2 bg-white">{settings.maxMessageLength} car.</span>
        </div>
        <input type="range" min="100" max="1000" step="50" value={settings.maxMessageLength}
          onChange={(e) => onUpdate("maxMessageLength", Number(e.target.value))}
          className="w-full h-3 appearance-none bg-white border-2 border-black accent-foreground" />
      </div>

      {/* Language level */}
      <div className="retro-card retro-card-tilt-1 p-4" style={{ backgroundColor: "var(--retro-orange)" }}>
        <h3 className="text-[13px] font-black text-foreground mb-2 uppercase">🗣️ NIVEAU DE LANGAGE</h3>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["simple", "🍼", "Simple", "Mots très simples"],
            ["adapté", "📖", "Adapté", "Adapté à l'âge"],
            ["avancé", "🎓", "Avancé", "Vocabulaire riche"],
          ] as const).map(([val, emoji, label, desc]) => (
            <button key={val} onClick={() => onUpdate("languageLevel", val)}
              className={`p-2.5 text-center transition-all border-4 border-black ${
                settings.languageLevel === val
                  ? "bg-white ring-2 ring-foreground/20"
                  : "bg-white/60 hover:bg-white"
              }`}
              style={{ boxShadow: settings.languageLevel === val ? "4px 4px 0px rgba(0,0,0,0.25)" : "2px 2px 0px rgba(0,0,0,0.15)" }}>
              <span className="text-lg block">{emoji}</span>
              <span className="text-[10px] font-black block mt-0.5 text-foreground uppercase">{label}</span>
              <span className="text-[8px] text-foreground/60 font-bold">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Blocked topics */}
      <div className="retro-card retro-card-tilt-2 p-4" style={{ backgroundColor: "var(--retro-red)" }}>
        <h3 className="text-[13px] font-black text-foreground mb-2 uppercase">🚫 SUJETS BLOQUÉS</h3>
        <p className="text-[10px] text-foreground/60 mb-3 font-bold">Bobby évitera automatiquement ces sujets</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {settings.blockedTopics.map(t => (
            <button key={t} onClick={() => onUpdate("blockedTopics", settings.blockedTopics.filter(x => x !== t))}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border-2 border-black text-foreground text-[11px] font-black hover:bg-foreground hover:text-background transition-all active:scale-95">
              {t} <X className="w-3 h-3" />
            </button>
          ))}
          {settings.blockedTopics.length === 0 && (
            <span className="text-[11px] text-foreground/50 font-bold italic">Aucun sujet bloqué</span>
          )}
        </div>
        <input type="text" value={newBlockedTopic}
          onChange={(e) => setNewBlockedTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newBlockedTopic.trim()) {
              if (!settings.blockedTopics.includes(newBlockedTopic.trim())) {
                onUpdate("blockedTopics", [...settings.blockedTopics, newBlockedTopic.trim()]);
              }
              setNewBlockedTopic("");
            }
          }}
          placeholder="Ajouter un sujet puis Entrée…"
          className="w-full px-4 py-2.5 bg-white text-[12px] text-foreground placeholder:text-foreground/40 border-4 border-black outline-none font-bold" />
      </div>

      {/* Face tracking */}
      <div className="retro-card retro-card-tilt-3 p-4" style={{ backgroundColor: "var(--retro-blue)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-[12px] font-black text-foreground uppercase">📷 SUIVI DU VISAGE</h4>
            <p className="text-[9px] text-foreground/60 mt-0.5 font-bold">Bobby suit le regard de l'enfant via la caméra</p>
          </div>
          <Toggle value={settings.enableCamera} onChange={async (v) => {
            if (v) {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 } });
                stream.getTracks().forEach(t => t.stop());
                onUpdate("enableCamera", true);
              } catch { alert("Impossible d'accéder à la caméra."); }
            } else { onUpdate("enableCamera", false); }
          }} />
        </div>
      </div>

      {/* Bilingual mode */}
      <div className="retro-card retro-card-tilt-4 p-4 relative overflow-hidden" style={{ backgroundColor: "var(--retro-yellow)" }}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-[12px] font-black text-foreground uppercase">🌍 MODE BILINGUE</h4>
              <span className="text-[8px] px-1.5 py-0.5 border-2 border-black bg-white font-black">BIENTÔT</span>
            </div>
            <p className="text-[9px] text-foreground/60 mt-0.5 font-bold">Français / Anglais — Bobby parle les deux langues</p>
            <p className="text-[9px] text-foreground/80 mt-1 font-black">⚠️ Téléchargement lourd requis (~800 Mo)</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/50 text-foreground/40 text-[12px] font-black cursor-not-allowed border-4 border-dashed border-black/30 uppercase"
          >
            <span className="text-lg">📥</span>
            TÉLÉCHARGER LE PACK BILINGUE
          </button>
          <p className="text-[8px] text-foreground/40 text-center leading-relaxed font-bold">
            Le mode bilingue nécessite un téléchargement de données linguistiques.<br />
            Cette fonctionnalité sera disponible dans une prochaine mise à jour.
          </p>
        </div>
      </div>

      {/* Save */}
      <button onClick={onSave}
        className={`w-full py-3.5 text-[14px] font-black transition-all active:scale-95 border-4 border-black uppercase ${
          saved
            ? "bg-[var(--retro-green)] text-foreground"
            : "bg-foreground text-background hover:opacity-90"
        }`}
        style={{ boxShadow: "5px 5px 0px rgba(0,0,0,0.3)" }}>
        {saved ? "✅ ENREGISTRÉ !" : "💾 ENREGISTRER"}
      </button>
    </div>
  );
};

export default LimitsSettings;
