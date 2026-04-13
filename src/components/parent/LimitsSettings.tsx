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
    className={`relative w-12 h-7 rounded-full transition-all duration-300 ${value ? "bg-primary" : "bg-muted"}`}>
    <div className={`w-5 h-5 rounded-full bg-card shadow-md transition-all duration-300 ${value ? "translate-x-6" : "translate-x-1"}`} />
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
        className="flex items-center gap-1.5 text-[13px] font-extrabold text-primary hover:underline mb-1 active:scale-95 transition-all">
        <ChevronLeft className="w-4 h-4" /> Réglages
      </button>

      <h2 className="text-[18px] font-black text-foreground animate-fadeInUp">⏱️ Limites & Contrôle</h2>
      <p className="text-[12px] text-muted-foreground -mt-2 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        Gardez le contrôle sur le temps et le contenu de Bobby
      </p>

      {/* Daily time limit */}
      <div className="bg-card rounded-2xl p-4 border-2 border-border/20 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">⏳</span>
          <h3 className="text-[14px] font-black text-foreground">Limite de temps journalière</h3>
          <span className="ml-auto text-[14px] font-black text-primary">{limitMinutes} min</span>
        </div>
        <input type="range" min="10" max="180" step="5" value={limitMinutes}
          onChange={(e) => onUpdate("timeLimitMinutes", Number(e.target.value))}
          className="w-full h-2.5 rounded-full appearance-none bg-muted accent-primary" />
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1 font-bold">
          <span>10 min</span><span>1h</span><span>2h</span><span>3h</span>
        </div>
        {todayDuration > 0 && (
          <div className="mt-3 pt-3 border-t border-border/20">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] text-muted-foreground font-bold">Utilisé aujourd'hui</span>
              <span className="text-[12px] font-mono font-black text-foreground">{formatDuration(todayDuration)}</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${todayDuration / 60 > limitMinutes ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${Math.min(100, (todayDuration / 60 / limitMinutes) * 100)}%` }} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">
              {todayDuration / 60 > limitMinutes ? "⚠️ Limite dépassée" : `${Math.round(limitMinutes - todayDuration / 60)} min restantes`}
            </p>
          </div>
        )}
      </div>

      {/* Auto stop + Night mode */}
      <div className="grid grid-cols-2 gap-2 animate-fadeInUp" style={{ animationDelay: "0.15s" }}>
        <div className="bg-card rounded-2xl p-4 border-2 border-border/20">
          <span className="text-2xl block mb-2">🛑</span>
          <h4 className="text-[12px] font-black text-foreground mb-1">Arrêt auto</h4>
          <p className="text-[9px] text-muted-foreground mb-2">Bobby s'arrête quand la limite est atteinte</p>
          <Toggle value={settings.autoStop} onChange={(v) => onUpdate("autoStop", v)} />
        </div>
        <div className="bg-card rounded-2xl p-4 border-2 border-border/20">
          <span className="text-2xl block mb-2">🌙</span>
          <h4 className="text-[12px] font-black text-foreground mb-1">Mode nuit</h4>
          <p className="text-[9px] text-muted-foreground mb-2">Bobby se met en veille automatiquement</p>
          <Toggle value={settings.nightMode.active} onChange={(v) => onUpdateNested("nightMode", "active", v)} />
        </div>
      </div>

      {/* Night mode hours */}
      {settings.nightMode.active && (
        <div className="bg-card rounded-2xl p-4 border-2 border-border/20 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <h4 className="text-[12px] font-black text-foreground mb-3">🌙 Plage horaire de veille</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground mb-1 font-bold">Début (soir)</p>
              <input type="time" value={settings.nightMode.startHour}
                onChange={(e) => onUpdateNested("nightMode", "startHour", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted text-[13px] text-foreground font-bold outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <Sun className="w-4 h-4 text-muted-foreground mt-4" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground mb-1 font-bold">Fin (matin)</p>
              <input type="time" value={settings.nightMode.endHour}
                onChange={(e) => onUpdateNested("nightMode", "endHour", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted text-[13px] text-foreground font-bold outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>
      )}

      {/* Interaction controls */}
      <div className="bg-card rounded-2xl p-4 border-2 border-border/20 animate-fadeInUp" style={{ animationDelay: "0.25s" }}>
        <h3 className="text-[14px] font-black text-foreground mb-3">👆 Modes d'interaction</h3>
        {([
          ["wakeWord", "🎤", "Mot de réveil", "Bobby se réveille à la voix"],
          ["tap", "👆", "Toucher l'écran", "Activation par toucher"],
          ["interruption", "⚠️", "Interruption", "L'enfant peut couper Bobby"],
        ] as const).map(([key, emoji, label, desc]) => (
          <div key={key} className="flex items-center justify-between py-2.5 border-b border-border/10 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-lg">{emoji}</span>
              <div>
                <span className="text-[12px] font-black text-foreground">{label}</span>
                <p className="text-[9px] text-muted-foreground">{desc}</p>
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
      <div className="bg-card rounded-2xl p-4 border-2 border-border/20 animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-black text-foreground">📝 Longueur max des messages</h3>
          <span className="text-[12px] font-mono font-bold text-primary">{settings.maxMessageLength} car.</span>
        </div>
        <input type="range" min="100" max="1000" step="50" value={settings.maxMessageLength}
          onChange={(e) => onUpdate("maxMessageLength", Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none bg-muted accent-primary" />
      </div>

      {/* Language level */}
      <div className="bg-card rounded-2xl p-4 border-2 border-border/20 animate-fadeInUp" style={{ animationDelay: "0.35s" }}>
        <h3 className="text-[13px] font-black text-foreground mb-2">🗣️ Niveau de langage</h3>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["simple", "🍼", "Simple", "Mots très simples"],
            ["adapté", "📖", "Adapté", "Adapté à l'âge"],
            ["avancé", "🎓", "Avancé", "Vocabulaire riche"],
          ] as const).map(([val, emoji, label, desc]) => (
            <button key={val} onClick={() => onUpdate("languageLevel", val)}
              className={`p-2.5 rounded-xl text-center transition-all border-2 ${
                settings.languageLevel === val
                  ? "bg-primary/8 border-primary/30"
                  : "bg-muted/30 border-border/20 hover:border-primary/15"
              }`}>
              <span className="text-lg block">{emoji}</span>
              <span className={`text-[10px] font-black block mt-0.5 ${settings.languageLevel === val ? "text-primary" : "text-foreground/70"}`}>{label}</span>
              <span className="text-[8px] text-muted-foreground">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Blocked topics */}
      <div className="bg-card rounded-2xl p-4 border-2 border-border/20 animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
        <h3 className="text-[13px] font-black text-foreground mb-2">🚫 Sujets bloqués</h3>
        <p className="text-[10px] text-muted-foreground mb-3">Bobby évitera automatiquement ces sujets</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {settings.blockedTopics.map(t => (
            <button key={t} onClick={() => onUpdate("blockedTopics", settings.blockedTopics.filter(x => x !== t))}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-destructive/10 text-destructive text-[11px] font-bold hover:bg-destructive/20 transition-all active:scale-95">
              {t} <X className="w-3 h-3" />
            </button>
          ))}
          {settings.blockedTopics.length === 0 && (
            <span className="text-[11px] text-muted-foreground italic">Aucun sujet bloqué</span>
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
          className="w-full px-4 py-2.5 rounded-xl bg-muted text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
      </div>

      {/* Face tracking */}
      <div className="bg-card rounded-2xl p-4 border-2 border-border/20 animate-fadeInUp" style={{ animationDelay: "0.45s" }}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-[12px] font-black text-foreground">📷 Suivi du visage</h4>
            <p className="text-[9px] text-muted-foreground mt-0.5">Bobby suit le regard de l'enfant via la caméra</p>
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

      {/* Save */}
      <button onClick={onSave}
        className={`w-full py-3.5 rounded-2xl text-[14px] font-black transition-all active:scale-95 ${
          saved
            ? "bg-emerald-500/15 text-emerald-700 border-2 border-emerald-500/30"
            : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
        }`}>
        {saved ? "✅ Enregistré !" : "💾 Enregistrer"}
      </button>
    </div>
  );
};

export default LimitsSettings;
