import { useState } from "react";
import { Sparkles, Mic, BookOpen, Zap, Heart } from "lucide-react";
import { Card } from "@/components/parent/SharedUI";

const NouveautesTab = () => {
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionSent, setSuggestionSent] = useState(false);

  const handleSuggestionSubmit = () => {
    if (!suggestionText.trim()) return;
    console.log("[Suggestion utilisateur]", suggestionText.trim());
    setSuggestionText("");
    setSuggestionSent(true);
    setTimeout(() => setSuggestionSent(false), 3000);
  };

  return (
    <div className="p-4 space-y-3">
      {/* Version banner */}
      <div className="retro-card retro-card-tilt-1 p-4" style={{ backgroundColor: 'var(--retro-blue)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-black" />
          <h3 className="text-[13px] font-black text-black uppercase">Bobby v2.0</h3>
          <span className="text-[9px] px-2 py-0.5 border-2 border-black bg-white font-black">Dernière mise à jour</span>
        </div>
        <p className="text-[11px] text-black/60 font-bold">10 avril 2026</p>
      </div>

      {/* 🎤 Voix */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
      <Card title="🎤 Voix émotionnelles V2" icon={Mic}>
        <div className="space-y-2">
          {[
            { emoji: "🧒", name: "Enfant (Lily)", desc: "Cartoon authentique, expressif, joyeux — stability 40%, style 70%" },
            { emoji: "👩", name: "Maman (Matilda)", desc: "Ultra apaisante, maternelle, lente — stability 85%, speed -12%" },
            { emoji: "👨", name: "Papa (George)", desc: "Calme, protecteur, posé — stability 90%, style minimal" },
          ].map((v) => (
            <div key={v.name} className="flex items-start gap-3 p-2.5 border-2 border-black bg-white">
              <span className="text-xl">{v.emoji}</span>
              <div>
                <h4 className="text-[12px] font-black text-black uppercase">{v.name}</h4>
                <p className="text-[10px] text-black/60 leading-tight mt-0.5 font-bold">{v.desc}</p>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-3 p-2.5 border-2 border-black bg-[var(--retro-yellow)]">
            <span className="text-xl">🎭</span>
            <div>
              <h4 className="text-[12px] font-black text-black uppercase">8 émotions dynamiques</h4>
              <p className="text-[10px] text-black/60 leading-tight mt-0.5 font-bold">
                Joyeux, triste, effrayé, excité, calme, curieux, en colère, ennuyé — la voix s'adapte automatiquement
              </p>
            </div>
          </div>
        </div>
      </Card>
      </div>

      {/* 📖 Histoires */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.15s" }}>
      <Card title="📖 Histoires & Personnages" icon={BookOpen}>
        <div className="space-y-2">
          {[
            { emoji: "👑", label: "Princesse", tag: "Conte" },
            { emoji: "🏴‍☠️", label: "Pirate", tag: "Aventure" },
            { emoji: "🚀", label: "Espace", tag: "Sci-Fi" },
            { emoji: "🐉", label: "Animaux", tag: "Nature" },
            { emoji: "✨", label: "Magie", tag: "Fantaisie" },
            { emoji: "🧠", label: "Éducatif", tag: "Apprentissage" },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-3 py-1.5">
              <span className="text-lg">{t.emoji}</span>
              <span className="text-[12px] font-black text-black flex-1">{t.label}</span>
              <span className="text-[9px] px-2 py-0.5 border border-black bg-white text-black font-black">{t.tag}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2.5 border-2 border-black bg-white">
          <p className="text-[10px] text-black/60 font-bold">
            🧒 <strong className="text-black font-black">Bobby</strong> — personnage principal, ami imaginaire vivant dans un jouet
          </p>
          <p className="text-[10px] text-black/60 mt-1 font-bold">
            🎵 <strong className="text-black font-black">Zik</strong> — ami imaginaire de Bobby, un peu coquin
          </p>
        </div>
      </Card>
      </div>

      {/* ⚡ Nouvelles fonctionnalités */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
      <Card title="⚡ Nouvelles fonctionnalités" icon={Zap}>
        <div className="space-y-2.5">
          {[
            { emoji: "🌙", title: "Mode calme automatique", desc: "Voix plus douce quand le mode nuit ou personnalité calme est activé" },
            { emoji: "⚡", title: "Vitesse de voix réelle", desc: "Le réglage Lent/Normal/Rapide modifie la vitesse ElevenLabs en temps réel" },
            { emoji: "🧠", title: "Mémoire enfant", desc: "Bobby se souvient des thèmes favoris et préférences entre les sessions" },
            { emoji: "🎙️", title: "Deepgram STT", desc: "Reconnaissance vocale en temps réel pour une écoute fluide" },
            { emoji: "📊", title: "Analyses émotionnelles", desc: "Scores de sociabilité, curiosité et stabilité émotionnelle par session" },
            { emoji: "🔒", title: "Sécurité renforcée", desc: "Filtrage contenu, code PIN, mot safe, sujets bloqués" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{f.emoji}</span>
              <div>
                <h4 className="text-[12px] font-black text-black uppercase">{f.title}</h4>
                <p className="text-[10px] text-black/60 leading-tight mt-0.5 font-bold">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      </div>

      {/* 💡 Suggérer une idée */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.25s" }}>
      <Card title="💡 Suggérer une idée" icon={Heart}>
        <p className="text-[10px] text-black/60 mb-3 leading-tight font-bold">
          Vous avez une idée pour améliorer Bobby ? Partagez-la avec nous !
        </p>
        <textarea
          value={suggestionText}
          onChange={(e) => setSuggestionText(e.target.value)}
          placeholder="Ex: Ajouter une voix en anglais, un mode comptine..."
          rows={3}
          className="w-full px-4 py-2.5 bg-white text-sm text-black placeholder:text-black/40 border-4 border-black outline-none font-bold resize-none"
        />
        <button
          onClick={handleSuggestionSubmit}
          disabled={!suggestionText.trim() || suggestionSent}
          className={`mt-2 w-full py-2.5 text-[12px] font-black transition-all border-4 border-black uppercase ${
            suggestionSent
              ? "bg-[var(--retro-green)] text-black"
              : suggestionText.trim()
                ? "bg-foreground text-background hover:opacity-90"
                : "bg-white/50 text-black/40 cursor-not-allowed border-dashed"
          }`}
          style={{ boxShadow: suggestionText.trim() && !suggestionSent ? "3px 3px 0px rgba(0,0,0,0.2)" : "none" }}>
          {suggestionSent ? "✅ MERCI POUR VOTRE IDÉE !" : "ENVOYER MA SUGGESTION"}
        </button>
      </Card>
      </div>
    </div>
  );
};

export default NouveautesTab;
