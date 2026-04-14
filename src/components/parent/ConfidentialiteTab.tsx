import { useState } from "react";
import {
  ChevronLeft, Lock, Shield, AlertTriangle, Eye, EyeOff,
  Mic, BarChart3, Calendar, Trash2, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Toggle, SettingRow, Card } from "@/components/parent/SharedUI";
import type { ParentSettings } from "@/components/parentSettings";
import type {
  ParentAnalysis as Analysis,
  ParentSession as Session,
} from "@/lib/bobby/parentDashboard";

interface ConfidentialiteTabProps {
  settings: ParentSettings;
  sessions: Session[];
  analyses: Analysis[];
  displayName: string;
  childName: string;
  onUpdate: <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => void;
  setConfirmDialog: (d: {
    title: string; description: string; confirmLabel?: string;
    variant?: "danger" | "warning"; onConfirm: () => void;
  } | null) => void;
  setActiveTab: (tab: string) => void;
  loadData: () => void;
}

const ConfidentialiteTab = ({
  settings, sessions, analyses, displayName, childName,
  onUpdate, setConfirmDialog, setActiveTab, loadData,
}: ConfidentialiteTabProps) => {
  const [confSection, setConfSection] = useState<"securite" | "donnees" | "rgpd" | null>(null);

  const dataCategories = [
    { id: "conversations", emoji: "💬", label: "Conversations", desc: "Messages texte", count: sessions.reduce((s, x) => s + x.message_count, 0) },
    { id: "audio", emoji: "🎙️", label: "Enregistrements", desc: "Fichiers audio", count: analyses.filter(a => a.audio_path).length },
    { id: "analyses", emoji: "📊", label: "Analyses IA", desc: "Résumés, scores", count: analyses.length },
    { id: "memories", emoji: "🧠", label: "Mémoire", desc: "Préférences", count: 1 },
  ];

  // ── Sub-section: Sécurité ──
  if (confSection === "securite") return (
    <div className="p-4 space-y-3 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
      <button onClick={() => setConfSection(null)} className="flex items-center gap-1.5 text-[13px] font-black uppercase text-black hover:opacity-70 mb-1 transition-all border-2 border-black px-3 py-1.5 bg-white" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <ChevronLeft className="w-4 h-4" /> CONFIDENTIALITÉ
      </button>
      <Card title="Code PIN parental" icon={Lock}>
        <p className="text-[10px] text-black/60 mb-3 leading-tight font-bold">Protège l'accès au Mode Parent avec un code à 4 chiffres</p>
        <div className="flex gap-2 items-center">
          <input type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*"
            value={settings.parentPin}
            onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 4); onUpdate("parentPin", val); }}
            placeholder="● ● ● ●"
            className="flex-1 px-4 py-2.5 bg-white text-sm text-black text-center tracking-[0.5em] placeholder:text-black/40 border-4 border-black outline-none font-mono font-black" />
          {settings.parentPin.length === 4 && (
            <span className="text-[11px] text-black font-black flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Actif</span>
          )}
        </div>
        {settings.parentPin.length === 4 && (
          <button onClick={() => onUpdate("parentPin", "")} className="mt-2 text-[11px] text-black font-black hover:underline uppercase">Supprimer le code PIN</button>
        )}
      </Card>
      <Card title="Niveau de filtrage" icon={Shield}>
        <div className="space-y-2">
          {([
            ["standard", "🟢", "Standard", "Contenu adapté aux enfants"],
            ["strict", "🔒", "Strict", "Filtre renforcé, exclusivement positif"],
          ] as const).map(([val, emoji, label, desc]) => (
            <button key={val} onClick={() => onUpdate("contentFilter", val)}
              className={`w-full p-3 text-left transition-all border-2 border-black ${settings.contentFilter === val ? "bg-[var(--retro-green)] ring-2 ring-foreground/20" : "bg-white hover:bg-[var(--retro-yellow)]"}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{emoji}</span>
                <div>
                  <h4 className="text-[12px] font-black text-black uppercase">{label}</h4>
                  <p className="text-[10px] text-black/60 mt-0.5 font-bold">{desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Protections" icon={Shield}>
        <div className="space-y-1">
          <SettingRow icon={Shield} title="Mode ultra-safe" desc="Protection maximale activée">
            <Toggle value={settings.ultraSafe} onChange={(v) => onUpdate("ultraSafe", v)} />
          </SettingRow>
          <SettingRow icon={Lock} title="Bloquer infos personnelles" desc="Empêche le partage de données personnelles">
            <Toggle value={settings.blockPersonalInfo} onChange={(v) => onUpdate("blockPersonalInfo", v)} />
          </SettingRow>
          <SettingRow icon={Shield} title="Bloquer les liens externes" desc="Bobby ne mentionne aucun site web">
            <Toggle value={settings.blockExternalLinks} onChange={(v) => onUpdate("blockExternalLinks", v)} />
          </SettingRow>
        </div>
      </Card>
      <Card title="Mot de sécurité" icon={AlertTriangle}>
        <p className="text-[10px] text-black/60 mb-3 leading-tight font-bold">Si l'enfant dit ce mot, Bobby réagit immédiatement</p>
        <input type="text" value={settings.safeWord}
          onChange={(e) => onUpdate("safeWord", e.target.value.slice(0, 30))}
          placeholder="Ex: 'au secours', 'aide-moi'…"
          className="w-full px-4 py-2.5 bg-white text-sm text-black placeholder:text-black/40 border-4 border-black outline-none font-bold mb-3" />
        {settings.safeWord.trim() && (
          <div className="grid grid-cols-3 gap-2">
            {([
              ["pause", "⏸️", "Pause"],
              ["alert", "🔔", "Alerte"],
              ["stop", "🛑", "Stop"],
            ] as const).map(([val, emoji, label]) => (
              <button key={val} onClick={() => onUpdate("safeWordAction", val)}
                className={`p-3 text-center transition-all border-2 border-black ${settings.safeWordAction === val ? "bg-[var(--retro-green)] ring-2 ring-foreground/20" : "bg-white hover:bg-[var(--retro-yellow)]"}`}>
                <span className="text-lg block">{emoji}</span>
                <span className={`text-[10px] font-black ${settings.safeWordAction === val ? "text-black" : "text-black/70"} uppercase`}>{label}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  // ── Sub-section: Données ──
  if (confSection === "donnees") return (
    <div className="p-4 space-y-3 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
      <button onClick={() => setConfSection(null)} className="flex items-center gap-1.5 text-[13px] font-black uppercase text-black hover:opacity-70 mb-1 transition-all border-2 border-black px-3 py-1.5 bg-white" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <ChevronLeft className="w-4 h-4" /> CONFIDENTIALITÉ
      </button>
      <Card title="Collecte de données" icon={Eye}>
        <div className="space-y-1">
          <SettingRow icon={Mic} title="Enregistrer les conversations" desc="Sauvegarde audio pour réécoute">
            <Toggle value={settings.recordConversations} onChange={(v) => onUpdate("recordConversations", v)} />
          </SettingRow>
          <SettingRow icon={EyeOff} title="Mode privé" desc="Analyse seule, sans audio">
            <Toggle value={settings.privacyMode} onChange={(v) => onUpdate("privacyMode", v)} />
          </SettingRow>
        </div>
      </Card>
      <Card title="Données stockées" icon={BarChart3}>
        <div className="grid grid-cols-2 gap-2">
          {dataCategories.map(cat => (
            <div key={cat.id} className="p-3 border-2 border-black bg-white">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-lg">{cat.emoji}</span>
                <span className="text-[11px] font-mono font-black text-black border-2 border-black px-2 py-0.5 bg-[var(--retro-yellow)]">{cat.count}</span>
              </div>
              <h4 className="text-[12px] font-black text-black uppercase">{cat.label}</h4>
              <p className="text-[9px] text-black/60 font-bold">{cat.desc}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Conservation" icon={Calendar}>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["7j", "🗓️", "7 jours"],
            ["30j", "📅", "30 jours"],
            ["90j", "📆", "90 jours"],
            ["forever", "♾️", "Indéfini"],
          ] as const).map(([val, emoji, label]) => (
            <button key={val} onClick={() => onUpdate("dataRetention", val)}
              className={`p-3 text-center transition-all border-2 border-black ${settings.dataRetention === val ? "bg-[var(--retro-green)] ring-2 ring-foreground/20" : "bg-white hover:bg-[var(--retro-yellow)]"}`}>
              <span className="text-xl block mb-1">{emoji}</span>
              <span className={`text-[11px] font-black ${settings.dataRetention === val ? "text-black" : "text-black/70"} uppercase`}>{label}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Suppression sélective" icon={Trash2}>
        <div className="space-y-2">
          {[
            { emoji: "🎙️", label: "Supprimer les audio", desc: "Garde les analyses", action: () => {
              setConfirmDialog({ title: "Supprimer les enregistrements ?", description: "Tous les fichiers audio seront supprimés. Les analyses textuelles seront conservées.", confirmLabel: "Supprimer", variant: "danger" as const, onConfirm: () => {
                supabase.storage.from("conversation-audio").list().then(({ data }) => { if (data?.length) supabase.storage.from("conversation-audio").remove(data.map(f => f.name)); });
                setConfirmDialog(null);
              }});
            }},
            { emoji: "📊", label: "Supprimer les analyses", desc: "Garde les sessions", action: () => {
              setConfirmDialog({ title: "Supprimer les analyses ?", description: "Toutes les analyses IA seront supprimées.", confirmLabel: "Supprimer", variant: "danger" as const, onConfirm: () => {
                supabase.from("conversation_analyses").delete().neq("id", "00000000-0000-0000-0000-000000000000").then(() => loadData());
                setConfirmDialog(null);
              }});
            }},
            { emoji: "🧠", label: "Réinitialiser la mémoire", desc: "Bobby oublie les préférences", action: () => {
              setConfirmDialog({ title: "Réinitialiser la mémoire ?", description: "Bobby oubliera toutes les préférences et intérêts.", confirmLabel: "Réinitialiser", variant: "warning" as const, onConfirm: () => {
                supabase.from("child_memories").delete().eq("child_name", displayName).then(() => loadData());
                setConfirmDialog(null);
              }});
            }},
          ].map(item => (
            <button key={item.label} onClick={item.action}
              className="w-full flex items-center gap-3 p-3 border-2 border-black bg-white hover:bg-[var(--retro-red)] transition-all text-left">
              <span className="text-lg">{item.emoji}</span>
              <div className="flex-1">
                <h4 className="text-[12px] font-black text-black uppercase">{item.label}</h4>
                <p className="text-[9px] text-black/60 font-bold">{item.desc}</p>
              </div>
              <Trash2 className="w-4 h-4 text-black" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );

  // ── Sub-section: RGPD ──
  if (confSection === "rgpd") return (
    <div className="p-4 space-y-3 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
      <button onClick={() => setConfSection(null)} className="flex items-center gap-1.5 text-[13px] font-black uppercase text-black hover:opacity-70 mb-1 transition-all border-2 border-black px-3 py-1.5 bg-white" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <ChevronLeft className="w-4 h-4" /> CONFIDENTIALITÉ
      </button>
      <Card title="Vos droits (RGPD)" icon={FileText}>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["access", "👁️", "Accès", "Voir vos données"],
            ["export", "📥", "Portabilité", "Export JSON"],
            ["rectify", "✏️", "Rectification", "Corriger"],
            ["delete", "🗑️", "Effacement", "Supprimer"],
          ] as const).map(([id, emoji, label, desc]) => (
            <button key={id}
              onClick={() => {
                if (id === "export") {
                  const allData = {
                    exportDate: new Date().toISOString(), childName,
                    settings: { ...settings, parentPin: "[MASQUÉ]" },
                    sessions: sessions.map(s => {
                      const analysis = analyses.find(a => a.session_id === s.id);
                      return { id: s.id, date: s.started_at, ended: s.ended_at, duration: s.duration_seconds, messages: s.message_count,
                        emotions: s.detected_emotions, topics: s.topics, tags: s.tags, summary: analysis?.summary,
                        transcription: analysis?.full_transcription,
                        scores: analysis ? { sociability: analysis.sociability_score, curiosity: analysis.curiosity_score, stability: analysis.emotional_stability_score } : null,
                        interests: analysis?.extracted_interests, insights: analysis?.behavior_insights,
                      };
                    }),
                  };
                  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `bobby-rgpd-export-${displayName}-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click(); URL.revokeObjectURL(url);
                } else if (id === "access") { setActiveTab("sessions"); }
                else if (id === "delete") {
                  setConfirmDialog({
                    title: "Supprimer TOUTES les données ?",
                    description: "Cette action est IRRÉVERSIBLE. Toutes les sessions, analyses, messages et mémoires de Bobby seront effacés.",
                    confirmLabel: "Tout supprimer",
                    variant: "danger",
                    onConfirm: () => {
                      Promise.all([
                        supabase.from("conversation_analyses").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
                        supabase.from("session_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
                        supabase.from("child_sessions").delete().eq("child_name", displayName),
                        supabase.from("child_memories").delete().eq("child_name", displayName),
                      ]).then(() => loadData());
                      setConfirmDialog(null);
                    },
                  });
                } else if (id === "rectify") { setActiveTab("profil"); }
              }}
              className="p-3 text-left transition-all border-2 border-black bg-white hover:bg-[var(--retro-yellow)]">
              <span className="text-xl block mb-1">{emoji}</span>
              <h4 className="text-[12px] font-black text-black uppercase">{label}</h4>
              <p className="text-[9px] text-black/60 font-bold">{desc}</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );

  // ── Main grid ──
  const confCards = [
    { id: "securite" as const, emoji: "🛡️", label: "Sécurité", desc: "PIN, filtrage, protections", bg: "var(--retro-red)" },
    { id: "donnees" as const, emoji: "💾", label: "Données", desc: "Collecte, stockage, suppression", bg: "var(--retro-blue)" },
    { id: "rgpd" as const, emoji: "📜", label: "RGPD", desc: "Accès, export, effacement", bg: "var(--retro-green)" },
  ];

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <h2 className="text-[16px] font-black text-black animate-fadeInUp uppercase" style={{ animationDelay: "0.05s" }}>🔒 Confidentialité</h2>
      <div className="grid grid-cols-2 gap-3">
        {confCards.map((card, i) => (
          <button key={card.id} onClick={() => setConfSection(card.id)}
            className="retro-card retro-card-tilt p-4 text-left hover:shadow-lg transition-all animate-fadeInUp"
            style={{ animationDelay: `${0.1 + i * 0.05}s`, backgroundColor: card.bg }}>
            <span className="text-3xl block mb-2">{card.emoji}</span>
            <h3 className="text-[14px] font-black text-gray-800 leading-tight uppercase">{card.label}</h3>
            <p className="text-[10px] text-gray-600 mt-1 leading-snug font-bold">{card.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConfidentialiteTab;
