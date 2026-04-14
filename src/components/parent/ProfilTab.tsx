import { useState } from "react";
import SaveButton from "./SaveButton";
import { ArrowLeft, X } from "lucide-react";
import type { ParentSettings } from "@/components/parentSettings";

interface ProfilTabProps {
  settings: ParentSettings;
  childName: string;
  allInterests: [string, number][];
  onUpdate: <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => void;
  onSave: () => void;
  saved: boolean;
  onBack?: () => void;
  showBackButton?: boolean;
  onPendingNameChange: (name: string) => void;
}

const ProfilTab = ({
  settings, childName, allInterests, onUpdate, onSave, saved,
  onBack, showBackButton, onPendingNameChange,
}: ProfilTabProps) => {
  const [newBlockedTopic, setNewBlockedTopic] = useState("");

  return (
    <div className="p-4 space-y-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {showBackButton && onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-black uppercase text-black hover:opacity-70 mb-1 transition-all border-2 border-black px-3 py-1.5 bg-white">
          <ArrowLeft className="w-4 h-4" /> RÉGLAGES
        </button>
      )}

      {/* Avatar + Name + Age */}
      <div className="retro-card retro-card-tilt-1 p-4" style={{ backgroundColor: 'var(--retro-blue)' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 border-4 border-black bg-white flex items-center justify-center text-4xl shrink-0">👤</div>
          <div className="flex-1 min-w-0">
            <input type="text" value={settings.childName}
              onChange={(e) => onUpdate("childName", e.target.value)}
              placeholder="Prénom"
              className="w-full bg-transparent text-xl font-black text-black outline-none placeholder:text-black/40 border-b-2 border-black pb-1 focus:border-foreground transition-colors uppercase" />
            <p className="text-[11px] text-black/60 mt-1 font-bold">Profil enfant</p>
            {settings.childName.trim() !== "" && settings.childName.trim() !== childName && (
              <button
                onClick={() => onPendingNameChange(settings.childName.trim())}
                className="mt-2 w-full py-2 border-2 border-black bg-foreground text-background text-[13px] font-black transition-all uppercase"
                style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                Enregistrer le prénom
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 mt-3 overflow-x-auto">
          {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(age => (
            <button key={age} onClick={() => onUpdate("childAge", age)}
              className={`shrink-0 w-10 h-10 border-2 border-black text-[13px] font-black transition-all duration-200 ${
                settings.childAge === age
                  ? "bg-foreground text-background"
                  : "bg-white text-black/60 hover:bg-[var(--retro-yellow)]"
              }`}>{age}</button>
          ))}
          <span className="self-center text-[10px] text-black/60 ml-1 shrink-0 font-black">ans</span>
        </div>
      </div>

      {/* Personality */}
      <div className="grid grid-cols-2 gap-2.5">
        {([
          ["calm", "😌", "Calme", "Doux et rassurant", "var(--retro-blue)"],
          ["energetic", "⚡", "Énergique", "Vif et enthousiaste", "var(--retro-yellow)"],
          ["educational", "📚", "Éducatif", "Curieux et savant", "var(--retro-green)"],
          ["balanced", "🎯", "Équilibré", "Un peu de tout", "var(--retro-purple)"],
        ] as const).map(([val, emoji, label, desc, bg]) => (
          <button key={val} onClick={() => onUpdate("personality", val)}
            className={`retro-card p-3 text-center transition-all duration-200 ${
              settings.personality === val ? "ring-2 ring-foreground/30" : ""
            }`}
            style={{ backgroundColor: bg }}>
            <span className="text-2xl block mb-1">{emoji}</span>
            <span className="text-[12px] font-black block text-black uppercase">{label}</span>
            <span className="text-[9px] text-black/60 leading-tight font-bold">{desc}</span>
          </button>
        ))}
      </div>

      {/* Interests */}
      <div className="retro-card retro-card-tilt-2 p-3" style={{ backgroundColor: 'var(--retro-green)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">💡</span>
          <h4 className="text-[12px] font-black text-black uppercase">Centres d'intérêt détectés</h4>
        </div>
        {allInterests.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allInterests.map(([interest], i) => {
              const retroBgs = ["var(--retro-blue)", "var(--retro-red)", "var(--retro-yellow)", "var(--retro-orange)", "var(--retro-purple)", "#e5e5e5"];
              return (
                <span key={interest} className="px-2.5 py-1 border-2 border-black text-[10px] font-black text-black"
                  style={{ backgroundColor: retroBgs[i % retroBgs.length] }}>
                  {interest}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-black/50 italic font-bold">Détection auto pendant les sessions 🔍</p>
        )}
      </div>

      {/* Blocked topics */}
      <div className="retro-card retro-card-tilt-3 p-3" style={{ backgroundColor: 'var(--retro-red)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">🚫</span>
          <h4 className="text-[12px] font-black text-black uppercase">Sujets bloqués</h4>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {settings.blockedTopics.map(t => (
            <button key={t} onClick={() => onUpdate("blockedTopics", settings.blockedTopics.filter(x => x !== t))}
              className="flex items-center gap-1 px-2.5 py-1 border-2 border-black bg-white text-black text-[10px] font-black hover:bg-foreground hover:text-background transition-all">
              {t} <X className="w-2.5 h-2.5" />
            </button>
          ))}
          {settings.blockedTopics.length === 0 && (
            <span className="text-[10px] text-black/50 italic font-bold">Aucun sujet bloqué</span>
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
          placeholder="Ajouter un sujet…"
          className="w-full px-3 py-2 bg-white text-[11px] text-black placeholder:text-black/40 border-4 border-black outline-none font-bold" />
      </div>

      <div className="pt-1 pb-2">
        <SaveButton onSave={onSave} saved={saved} />
      </div>
    </div>
  );
};

export default ProfilTab;
