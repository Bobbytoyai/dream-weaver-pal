import { lazy, Suspense, useState } from "react";
import LazyImportBoundary from "@/components/LazyImportBoundary";
import { Loader2, ChevronLeft, Shield, Lock, Eye, EyeOff, Mic, Calendar, FileText, Database, Scale, UserCheck } from "lucide-react";
import type { ParentSettings } from "@/components/parentSettings";
import type { ParentSession as Session } from "@/lib/bobby/parentDashboard";
import { Toggle, SettingRow, Card } from "@/components/parent/SharedUI";

const LazyVoiceSettings = lazy(() => import("@/components/parent/VoiceSettings"));
const LazyLimitsSettings = lazy(() => import("@/components/parent/LimitsSettings"));
const LazyBobbyCustomizer = lazy(() => import("@/components/parent/BobbyCustomizer"));
const LazyProfilTab = lazy(() => import("@/components/parent/ProfilTab"));

interface ReglagesTabProps {
  settings: ParentSettings;
  sessions: Session[];
  childName: string;
  allInterests: [string, number][];
  settingsSaved: boolean;
  reglagesSection: "voix" | "limites" | "personnalisation" | "profil" | null;
  setReglagesSection: (s: "voix" | "limites" | "personnalisation" | "profil" | null) => void;
  onUpdate: <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => void;
  onUpdateNested: <K extends keyof ParentSettings>(key: K, subKey: string, value: any) => void;
  onSave: () => void;
  onPendingNameChange: (name: string) => void;
}

const SuspenseFallback = () => (
  <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
);

// ── Back button component ──
const BackButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 text-[13px] font-black uppercase text-black hover:opacity-70 mb-1 transition-all border-2 border-black px-3 py-1.5 bg-white" style={{ fontFamily: "'Nunito', sans-serif" }}>
    <ChevronLeft className="w-4 h-4" /> {label}
  </button>
);

// ── RGPD / Privacy Page ──
const RGPDPage = ({ settings, onUpdate, onBack, onSave, saved }: {
  settings: ParentSettings;
  onUpdate: <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => void;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}) => {
  const [rgpdSection, setRgpdSection] = useState<"info" | "droits" | "collecte" | "conservation" | null>(null);

  // ── Sub: Informations légales ──
  if (rgpdSection === "info") return (
    <div className="p-4 space-y-3 animate-fadeInUp">
      <BackButton label="RGPD" onClick={() => setRgpdSection(null)} />
      <Card title="Responsable du traitement" icon={UserCheck}>
        <div className="space-y-2.5 text-[11px] text-black/80 font-bold leading-relaxed">
          <p>Bobby est édité par l'équipe Bobby AI. Les données de votre enfant sont traitées conformément au <strong className="text-black">Règlement Général sur la Protection des Données (RGPD)</strong> — Règlement UE 2016/679.</p>
          <div className="p-3 border-2 border-black bg-[var(--retro-yellow)]/30">
            <p className="text-[10px] font-black uppercase text-black mb-1">📧 Contact DPO</p>
            <p className="text-[10px]">privacy@bobby-ai.fr</p>
          </div>
        </div>
      </Card>
      <Card title="Base légale du traitement" icon={Scale}>
        <div className="space-y-2 text-[11px] text-black/80 font-bold leading-relaxed">
          <div className="p-2.5 border-2 border-black bg-white">
            <p className="text-[10px] font-black text-black uppercase mb-1">Consentement parental</p>
            <p className="text-[10px]">Le traitement des données repose sur le consentement du parent/tuteur légal, conformément à l'article 8 du RGPD (enfants de moins de 16 ans).</p>
          </div>
          <div className="p-2.5 border-2 border-black bg-white">
            <p className="text-[10px] font-black text-black uppercase mb-1">Intérêt légitime</p>
            <p className="text-[10px]">L'amélioration de l'expérience éducative et la sécurité de l'enfant constituent un intérêt légitime au sens de l'article 6(1)(f).</p>
          </div>
        </div>
      </Card>
      <Card title="Données collectées" icon={Database}>
        <div className="space-y-1.5">
          {[
            { emoji: "💬", label: "Conversations", desc: "Messages texte échangés avec Bobby" },
            { emoji: "🎙️", label: "Audio", desc: "Enregistrements vocaux (si activé)" },
            { emoji: "📊", label: "Analyses", desc: "Résumés, émotions détectées, centres d'intérêt" },
            { emoji: "🧠", label: "Mémoire", desc: "Préférences et progression de l'enfant" },
            { emoji: "⚙️", label: "Paramètres", desc: "Configuration parentale" },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-2.5 p-2 border-2 border-black bg-white">
              <span className="text-lg mt-0.5">{item.emoji}</span>
              <div>
                <h4 className="text-[11px] font-black text-black uppercase">{item.label}</h4>
                <p className="text-[9px] text-black/60 font-bold">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Sécurité des données" icon={Shield}>
        <div className="space-y-2 text-[11px] text-black/80 font-bold leading-relaxed">
          <p>🔒 Chiffrement en transit (TLS 1.3) et au repos (AES-256)</p>
          <p>🌍 Hébergement en Union Européenne</p>
          <p>🚫 Aucune vente de données à des tiers</p>
          <p>🤖 Aucun profilage publicitaire</p>
          <p>👶 Conformité COPPA & RGPD enfants</p>
        </div>
      </Card>
    </div>
  );

  // ── Sub: Vos droits ──
  if (rgpdSection === "droits") return (
    <div className="p-4 space-y-3 animate-fadeInUp">
      <BackButton label="RGPD" onClick={() => setRgpdSection(null)} />
      <Card title="Vos droits RGPD" icon={FileText}>
        <div className="space-y-2">
          {[
            { emoji: "👁️", article: "Art. 15", label: "Droit d'accès", desc: "Consulter toutes les données collectées sur votre enfant." },
            { emoji: "📥", article: "Art. 20", label: "Droit à la portabilité", desc: "Exporter vos données dans un format lisible (JSON)." },
            { emoji: "✏️", article: "Art. 16", label: "Droit de rectification", desc: "Modifier ou corriger les informations inexactes." },
            { emoji: "🗑️", article: "Art. 17", label: "Droit à l'effacement", desc: "Supprimer définitivement toutes les données." },
            { emoji: "⏸️", article: "Art. 18", label: "Droit à la limitation", desc: "Restreindre le traitement de certaines données." },
            { emoji: "🚫", article: "Art. 21", label: "Droit d'opposition", desc: "S'opposer au traitement à tout moment." },
          ].map(right => (
            <div key={right.label} className="p-3 border-2 border-black bg-white">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{right.emoji}</span>
                <h4 className="text-[12px] font-black text-black uppercase flex-1">{right.label}</h4>
                <span className="text-[9px] font-mono font-black text-black/50 border border-black px-1.5 py-0.5">{right.article}</span>
              </div>
              <p className="text-[10px] text-black/70 font-bold pl-7">{right.desc}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="p-3 border-2 border-black bg-[var(--retro-blue)]/30">
        <p className="text-[10px] font-black text-black uppercase mb-1">📮 Exercer vos droits</p>
        <p className="text-[10px] text-black/80 font-bold">Contactez notre DPO à privacy@bobby-ai.fr ou utilisez les options de suppression dans la section « Données » de l'onglet Confidentialité.</p>
      </div>
    </div>
  );

  // ── Sub: Collecte & contrôle ──
  if (rgpdSection === "collecte") return (
    <div className="p-4 space-y-3 animate-fadeInUp">
      <BackButton label="RGPD" onClick={() => setRgpdSection(null)} />
      <Card title="Contrôle de la collecte" icon={Eye}>
        <div className="space-y-1">
          <SettingRow icon={Mic} title="Enregistrer les conversations" desc="Sauvegarde audio pour réécoute parentale">
            <Toggle value={settings.recordConversations} onChange={(v) => onUpdate("recordConversations", v)} />
          </SettingRow>
          <SettingRow icon={EyeOff} title="Mode privé" desc="Analyse seule, aucun audio conservé">
            <Toggle value={settings.privacyMode} onChange={(v) => onUpdate("privacyMode", v)} />
          </SettingRow>
          <SettingRow icon={Lock} title="Bloquer infos personnelles" desc="Empêche le partage de données personnelles">
            <Toggle value={settings.blockPersonalInfo} onChange={(v) => onUpdate("blockPersonalInfo", v)} />
          </SettingRow>
        </div>
      </Card>
      <Card title="Conservation des données" icon={Calendar}>
        <p className="text-[10px] text-black/60 mb-3 font-bold leading-tight">Durée de rétention automatique des données collectées</p>
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
      {saved ? (
        <div className="text-center py-2">
          <span className="text-[11px] font-black text-black uppercase">✅ Sauvegardé</span>
        </div>
      ) : (
        <button onClick={onSave}
          className="w-full py-3 text-[13px] font-black uppercase border-4 border-black bg-[var(--retro-green)] hover:translate-y-[-1px] transition-all"
          style={{ boxShadow: "4px 4px 0px rgba(0,0,0,0.3)" }}>
          💾 Sauvegarder
        </button>
      )}
    </div>
  );

  // ── Main RGPD grid ──
  return (
    <div className="p-4 space-y-3 animate-fadeInUp">
      <BackButton label="RÉGLAGES" onClick={onBack} />
      <h2 className="text-[16px] font-black text-black uppercase">🔒 Confidentialité & RGPD</h2>
      <p className="text-[10px] text-black/60 font-bold leading-tight -mt-1">
        Gérez la protection des données de votre enfant conformément au RGPD
      </p>
      <div className="grid grid-cols-2 gap-3">
        {([
          { id: "info" as const, emoji: "📋", label: "Informations", desc: "Base légale, données collectées, sécurité", bg: "var(--retro-blue)" },
          { id: "droits" as const, emoji: "⚖️", label: "Vos droits", desc: "Accès, portabilité, effacement, opposition", bg: "var(--retro-green)" },
          { id: "collecte" as const, emoji: "🎛️", label: "Contrôle", desc: "Collecte, rétention, mode privé", bg: "var(--retro-yellow)" },
        ]).map((card, i) => (
          <button key={card.id} onClick={() => setRgpdSection(card.id)}
            className={`retro-card retro-card-tilt-${(i % 6) + 1} p-4 text-left hover:translate-y-[-2px] transition-all`}
            style={{ backgroundColor: card.bg, boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}>
            <span className="text-3xl block mb-2">{card.emoji}</span>
            <h3 className="text-[13px] font-black text-black leading-tight uppercase">{card.label}</h3>
            <p className="text-[9px] text-black/60 mt-1 leading-snug font-bold">{card.desc}</p>
          </button>
        ))}
      </div>
      <div className="p-3 border-2 border-black bg-[var(--retro-purple)]/20 mt-2">
        <p className="text-[10px] font-bold text-black/70 leading-relaxed">
          🇪🇺 Bobby respecte le <strong className="text-black">RGPD</strong> et la <strong className="text-black">COPPA</strong>. Aucune donnée n'est vendue. Le traitement repose sur votre consentement parental. Vous pouvez retirer ce consentement à tout moment.
        </p>
      </div>
    </div>
  );
};

const ReglagesTab = ({
  settings, sessions, childName, allInterests, settingsSaved,
  reglagesSection, setReglagesSection,
  onUpdate, onUpdateNested, onSave, onPendingNameChange,
}: ReglagesTabProps) => {
  const [showRGPD, setShowRGPD] = useState(false);

  if (showRGPD) {
    return (
      <RGPDPage
        settings={settings}
        onUpdate={onUpdate}
        onBack={() => setShowRGPD(false)}
        onSave={onSave}
        saved={settingsSaved}
      />
    );
  }

  if (reglagesSection === "voix") {
    return (
      <LazyImportBoundary label="voix">
        <Suspense fallback={<SuspenseFallback />}>
          <LazyVoiceSettings
            settings={settings}
            onUpdate={onUpdate}
            onBack={() => setReglagesSection(null)}
            onSave={onSave}
            saved={settingsSaved}
          />
        </Suspense>
      </LazyImportBoundary>
    );
  }

  if (reglagesSection === "limites") {
    const today = new Date().toLocaleDateString("fr-FR");
    const todaySessions = sessions.filter(s => new Date(s.started_at).toLocaleDateString("fr-FR") === today);
    const todayDur = todaySessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);
    return (
      <LazyImportBoundary label="limites">
        <Suspense fallback={<SuspenseFallback />}>
          <LazyLimitsSettings
            settings={settings}
            onUpdate={onUpdate}
            onUpdateNested={onUpdateNested}
            todayDuration={todayDur}
            onBack={() => setReglagesSection(null)}
            onSave={onSave}
            saved={settingsSaved}
          />
        </Suspense>
      </LazyImportBoundary>
    );
  }

  if (reglagesSection === "personnalisation") {
    return (
      <LazyImportBoundary label="personnalisation">
        <Suspense fallback={<SuspenseFallback />}>
          <LazyBobbyCustomizer
            settings={settings}
            onUpdate={(key, value) => onUpdate(key, value)}
            onBack={() => setReglagesSection(null)}
            onSave={onSave}
            saved={settingsSaved}
          />
        </Suspense>
      </LazyImportBoundary>
    );
  }

  if (reglagesSection === "profil") {
    return (
      <LazyImportBoundary label="profil">
        <Suspense fallback={<SuspenseFallback />}>
          <LazyProfilTab
            settings={settings}
            childName={childName}
            allInterests={allInterests}
            onUpdate={onUpdate}
            onSave={onSave}
            saved={settingsSaved}
            onBack={() => setReglagesSection(null)}
            showBackButton
            onPendingNameChange={onPendingNameChange}
          />
        </Suspense>
      </LazyImportBoundary>
    );
  }

  return (
    <div className="p-4 space-y-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <h2 className="text-[18px] font-black text-black animate-fadeInUp uppercase">⚙️ Réglages</h2>
      <div className="grid grid-cols-2 gap-3 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        {([
          ["voix", "🎤", "Voix & Sons", "Profils vocaux, vitesse, ton", "var(--retro-blue)"],
          ["limites", "⏱️", "Limites & Contrôle", "Temps, nuit, interactions, sujets", "var(--retro-yellow)"],
          ["profil", "👤", "Profil enfant", "Intérêts, mémoire, préférences", "var(--retro-purple)"],
        ] as const).map(([key, emoji, label, desc, bg], i) => (
          <button key={key} onClick={() => setReglagesSection(key)}
            className={`retro-card retro-card-tilt-${(i % 6) + 1} p-5 text-center transition-all duration-200 hover:translate-y-[-2px]`}
            style={{ backgroundColor: bg, boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}>
            <span className="text-4xl block mb-2">{emoji}</span>
            <span className="text-[14px] font-black text-black block uppercase">{label}</span>
            <span className="text-[10px] text-black/60 leading-tight block mt-1 font-bold">{desc}</span>
          </button>
        ))}
        <button onClick={() => setShowRGPD(true)}
          className="retro-card retro-card-tilt-4 p-5 text-center transition-all duration-200 hover:translate-y-[-2px]"
          style={{ backgroundColor: "var(--retro-green)", boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}>
          <span className="text-4xl block mb-2">🔒</span>
          <span className="text-[14px] font-black text-black block uppercase">RGPD & Vie privée</span>
          <span className="text-[10px] text-black/60 leading-tight block mt-1 font-bold">Données, droits, conformité</span>
        </button>
      </div>
    </div>
  );
};

export default ReglagesTab;
