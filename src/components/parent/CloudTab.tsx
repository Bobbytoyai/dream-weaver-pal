import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CloudUpload, LogIn, Trash2 } from "lucide-react";
import type { ParentSession as Session, ParentAnalysis as Analysis } from "@/lib/bobby/parentDashboard";
import { formatSyncTime, type CloudProfile } from "@/lib/bobby/cloudSync";
import { getCloudUsage, formatStorage, type CloudUsage } from "@/lib/bobby/cloudQuota";

interface CloudTabProps {
  sessions: Session[];
  analyses: Analysis[];
  user: { email?: string } | null;
  cloudProfile: CloudProfile | null;
  cloudLoading: boolean;
  cloudCopied: boolean;
  setCloudCopied: (v: boolean) => void;
  handleCloudSave: () => void;
  handleCloudDelete: () => void;
  setConfirmDialog: (d: {
    title: string; description: string; confirmLabel?: string;
    variant?: "danger" | "warning"; onConfirm: () => void;
  } | null) => void;
}

const CloudTab = ({
  sessions, analyses, user, cloudProfile, cloudLoading, cloudCopied, setCloudCopied,
  handleCloudSave, handleCloudDelete, setConfirmDialog,
}: CloudTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [quota, setQuota] = useState<CloudUsage | null>(null);

  useEffect(() => {
    if (user) {
      getCloudUsage().then(setQuota).catch(() => {});
    }
  }, [user]);

  const totalSessions = quota?.sessions ?? sessions.length;
  const totalMessages = quota?.messages ?? sessions.reduce((s, sess) => s + (sess.message_count || 0), 0);
  const totalAnalyses = quota?.analyses ?? analyses.length;
  const usedMB = quota?.usedMB ?? 0.01;
  const quotaMB = quota?.quotaMB ?? 500;
  const storageLabel = formatStorage(usedMB);
  const quotaLabel = formatStorage(quotaMB);
  const usedPercent = quotaMB > 0 ? Math.min(100, (usedMB / quotaMB) * 100) : 0;

  const plans = [
    {
      name: "Gratuit", price: "0€", period: "", emoji: "🆓",
      storage: "500 Mo",
      features: ["Toutes les fonctionnalités Bobby", "Conversation illimitée", "Bobby Store complet", "Dashboard parent"],
      cta: "Actuel", disabled: true,
    },
    {
      name: "Cloud+", price: "9,99€", period: "/mois", emoji: "☁️",
      storage: "20 Go",
      features: ["Tout le gratuit +", "Mémoire étendue", "Base de connaissances enrichie", "Synchronisation multi-appareils", "MemoryGraph™ Cloud"],
      cta: "Bientôt disponible", disabled: true, popular: true,
    },
  ];

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div className="retro-card p-6 text-center" style={{ backgroundColor: 'var(--retro-blue)' }}>
        <span className="text-5xl block mb-2">☁️</span>
        <h2 className="text-[22px] font-black text-gray-800 uppercase">Bobby Cloud</h2>
        <p className="text-[13px] text-gray-600 leading-relaxed font-bold">
          Sauvegardez, synchronisez et téléchargez tout le contenu de Bobby entre vos appareils.
        </p>
      </div>

      {/* STATUS BANNER */}
      {cloudLoading && (
        <div className="retro-card p-4 flex items-center gap-3 animate-pulse" style={{ backgroundColor: 'var(--retro-yellow)' }}>
          <Loader2 className="w-6 h-6 animate-spin text-gray-800" />
          <div>
            <p className="text-[14px] font-black text-gray-800 uppercase">Synchronisation en cours…</p>
            <p className="text-[11px] text-gray-600 font-bold">Veuillez patienter quelques secondes.</p>
          </div>
        </div>
      )}

      {!cloudLoading && !user && !cloudProfile && (
        <div className="retro-card p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--retro-red)', opacity: 0.9 }}>
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-[14px] font-black text-gray-800 uppercase">Connexion requise</p>
            <p className="text-[11px] text-gray-600 font-bold">Créez un compte ou connectez-vous pour activer Bobby Cloud.</p>
          </div>
        </div>
      )}

      {!cloudLoading && user && !cloudProfile && (
        <div className="retro-card p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--retro-yellow)', opacity: 0.9 }}>
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-[14px] font-black text-gray-800 uppercase">Cloud non activé</p>
            <p className="text-[11px] text-gray-600 font-bold">Connecté en tant que {user.email} — activez la synchronisation ci-dessous.</p>
          </div>
        </div>
      )}

      {/* CONNEXION / SYNC STATUS */}
      {cloudProfile ? (
        <div className="retro-card p-5 space-y-4" style={{ backgroundColor: 'var(--retro-green)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 border-2 border-black bg-white flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-black text-gray-800 uppercase">Connecté au Cloud</h3>
              <p className="text-[12px] text-gray-600 font-bold">{formatSyncTime(cloudProfile.last_synced_at)}</p>
            </div>
            <span className="px-2 py-1 border-2 border-black bg-white text-gray-800 text-[10px] font-black">ACTIF</span>
          </div>

          {/* Sync code */}
          <div className="border-2 border-black bg-white p-3">
            <p className="text-[11px] text-gray-600 font-black mb-1.5">📋 Code de synchronisation</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[16px] font-mono font-black text-primary tracking-widest text-center py-2 border-2 border-black bg-white">
                {cloudProfile.sync_code}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(cloudProfile.sync_code);
                  setCloudCopied(true);
                  setTimeout(() => setCloudCopied(false), 2000);
                  toast.success("Code copié !");
                }}
                className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-gray-800 hover:bg-muted transition-all">
                {cloudCopied ? <span>✓</span> : <span>📋</span>}
              </button>
            </div>
          </div>

          {/* Cloud data summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { emoji: "💬", value: totalSessions, label: "Sessions" },
              { emoji: "📝", value: totalMessages, label: "Messages" },
              { emoji: "🧠", value: totalAnalyses, label: "Analyses" },
            ].map(s => (
              <div key={s.label} className="border-2 border-black bg-white p-2.5 text-center">
                <span className="text-lg">{s.emoji}</span>
                <p className="text-[16px] font-black text-gray-800">{s.value}</p>
                <p className="text-[9px] text-gray-600 font-bold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleCloudSave} disabled={cloudLoading}
              className="flex flex-col items-center gap-1.5 p-3 border-4 border-black bg-white hover:bg-muted transition-all disabled:opacity-50">
              {cloudLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-800" /> : <CloudUpload className="w-5 h-5 text-gray-800" />}
              <span className="text-[12px] font-black text-gray-800 uppercase">Sauvegarder</span>
            </button>
            <button onClick={() => {
              setConfirmDialog({
                title: "Supprimer le profil Cloud ?",
                description: "Le code de synchronisation ne fonctionnera plus.",
                confirmLabel: "Supprimer",
                variant: "danger",
                onConfirm: () => { handleCloudDelete(); setConfirmDialog(null); },
              });
            }} disabled={cloudLoading}
              className="flex flex-col items-center gap-1.5 p-3 border-4 border-black hover:bg-muted transition-all disabled:opacity-50" style={{ backgroundColor: 'var(--retro-red)' }}>
              <Trash2 className="w-5 h-5 text-gray-800" />
              <span className="text-[12px] font-black text-gray-800 uppercase">Dissocier</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={() => navigate(`/bobby-cloud?returnTo=${encodeURIComponent(currentPath)}`)} disabled={cloudLoading}
            className="w-full retro-card p-5 hover:translate-y-[-2px] transition-all disabled:opacity-50" style={{ backgroundColor: 'var(--retro-blue)' }}>
            <div className="flex items-center gap-4">
              <CloudUpload className="w-9 h-9 text-gray-800" />
              <div className="text-left flex-1">
                <h3 className="text-[16px] font-black text-gray-800 uppercase">Créer un compte Cloud</h3>
                <p className="text-[12px] text-gray-600 font-bold mt-0.5">Inscription avec email et mot de passe</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate(`/bobby-cloud?returnTo=${encodeURIComponent(currentPath)}`)} disabled={cloudLoading}
            className="w-full retro-card p-5 hover:translate-y-[-2px] transition-all disabled:opacity-50" style={{ backgroundColor: 'var(--retro-green)' }}>
            <div className="flex items-center gap-4">
              <LogIn className="w-9 h-9 text-gray-800" />
              <div className="text-left flex-1">
                <h3 className="text-[16px] font-black text-gray-800 uppercase">J'ai déjà un compte</h3>
                <p className="text-[12px] text-gray-600 font-bold mt-0.5">Se connecter avec email et mot de passe</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* CONTENU SYNCHRONISÉ */}
      <div className="retro-card p-5">
        <h3 className="text-[16px] font-black text-black mb-3 uppercase">📦 Contenu inclus dans Bobby Cloud</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { emoji: "🧠", title: "Cerveau complet", desc: "Knowledge base, QA, mémoire enfant", bg: "var(--retro-purple)" },
            { emoji: "💬", title: "Conversations", desc: "Toutes les sessions Bobby ↔ enfant", bg: "var(--retro-blue)" },
            { emoji: "📚", title: "Bibliothèque", desc: "Histoires, contes et récits", bg: "var(--retro-yellow)" },
            { emoji: "🎓", title: "Contenu éducatif", desc: "Jeux, quiz, activités", bg: "var(--retro-green)" },
            { emoji: "🎙️", title: "Voix & TTS", desc: "Cache audio, préférences voix", bg: "var(--retro-red)" },
            { emoji: "📊", title: "Analyses IA", desc: "Rapports émotionnels, scores", bg: "#e5e5e5" },
          ].map(c => (
            <div key={c.title} className="border-2 border-black p-3" style={{ backgroundColor: c.bg }}>
              <span className="text-2xl block mb-1">{c.emoji}</span>
              <h4 className="text-[13px] font-black text-gray-800">{c.title}</h4>
              <p className="text-[10px] text-gray-600 leading-snug mt-0.5 font-bold">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TARIFS */}
      <div className="space-y-3">
        <h3 className="text-[16px] font-black text-black px-1 uppercase">💾 TARIFS BOBBY CLOUD</h3>
        <p className="text-[11px] text-black/60 px-1 -mt-1 font-bold">Utilisation actuelle : <span className="font-black text-black">{storageLabel}</span> / {quotaLabel}</p>
        <div className="mx-1 h-3 bg-white border-2 border-black overflow-hidden">
          <div className={`h-full transition-all ${usedPercent > 90 ? 'bg-red-500' : usedPercent > 70 ? 'bg-amber-500' : 'bg-foreground'}`} style={{ width: `${usedPercent}%` }} />
        </div>
        {plans.map((plan, pi) => {
          const planBgs = ["white", "var(--retro-blue)", "var(--retro-yellow)"];
          const tiltClass = `retro-card-tilt-${(pi % 6) + 1}`;
          return (
            <div key={plan.name} className={`retro-card ${tiltClass} p-4 relative ${plan.popular ? "ring-2 ring-foreground/20" : ""}`}
              style={{ backgroundColor: planBgs[pi] || "white" }}>
              {plan.popular && (
                <span className="absolute -top-2.5 right-4 px-3 py-0.5 border-2 border-black bg-[var(--retro-yellow)] text-black text-[10px] font-black">
                  ⭐ Recommandé
                </span>
              )}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{plan.emoji}</span>
                <div className="flex-1">
                  <h4 className="text-[17px] font-black text-black uppercase">{plan.name}</h4>
                  <span className="text-[12px] font-black text-black/70">💾 {plan.storage}</span>
                </div>
                <div className="text-right">
                  <span className="text-[22px] font-black text-black">{plan.price}</span>
                  {plan.period && <span className="text-[11px] text-black/60 font-bold">{plan.period}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5">
                    <span className="text-black text-[12px] font-black">✓</span>
                    <span className="text-[11px] text-black font-bold">{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  if (plan.cta === "Bientôt disponible") {
                    toast("🚧 Cette offre sera disponible prochainement !", { duration: 3000 });
                  }
                }}
                className={`w-full py-2.5 font-black text-[13px] transition-all border-4 border-black uppercase ${
                  plan.cta === "Actuel" || plan.cta === "Bientôt disponible"
                    ? "bg-white/50 text-black/40"
                    : "bg-foreground text-background hover:opacity-90"
                }`}
                style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                {plan.cta}
              </button>
            </div>
          );
        })}
      </div>


      {/* INFRASTRUCTURE FOOTER */}
      <div className="mt-4 pt-4 border-t-2 border-black/10">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {[
            { emoji: "🔒", label: "AES-256" },
            { emoji: "🇪🇺", label: "RGPD" },
            { emoji: "📱", label: "Multi-appareils" },
            { emoji: "🔄", label: "Sync auto" },
            { emoji: "📈", label: "Scalable" },
          ].map(f => (
            <span key={f.label} className="inline-flex items-center gap-1 px-2.5 py-1 border border-black bg-white text-[9px] font-black text-black">
              {f.emoji} {f.label}
            </span>
          ))}
        </div>
        <p className="text-center text-[9px] text-black/40 mt-2 font-bold">
          ☁️ Infrastructure sécurisée • Chiffrement bout en bout • Serveurs EU
        </p>
      </div>
    </div>
  );
};

export default CloudTab;
