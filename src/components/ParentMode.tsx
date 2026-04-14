import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import LazyImportBoundary from "@/components/LazyImportBoundary";
import {
  ArrowLeft, Loader2, RefreshCw, Bell,
  BarChart3, MessageSquare, Gamepad2, Settings, CloudUpload, Shield,
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import StoreGateWrapper from "@/components/StoreGateWrapper";
import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "./parentSettings";
import { useParentData } from "@/hooks/useParentData";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import NotificationPanel from "@/components/parent/NotificationPanel";
import NameChangeDialog from "@/components/parent/NameChangeDialog";
import { formatDate } from "@/components/parent/parentTypes";
import type { Tab } from "@/components/parent/parentTypes";

export type { ParentSettings };
export { DEFAULT_PARENT_SETTINGS };

// ─── Lazy tabs ──────────────────────────────────────────────────
const LazyDashboardTab = lazy(() => import("@/components/parent/DashboardTab"));
const LazySessionsListTab = lazy(() => import("@/components/parent/SessionsListTab"));
const LazySessionDetailView = lazy(() => import("@/components/parent/SessionDetailView"));
const LazyReglagesTab = lazy(() => import("@/components/parent/ReglagesTab"));
const LazyConfidentialiteTab = lazy(() => import("@/components/parent/ConfidentialiteTab"));
const LazyCloudTab = lazy(() => import("@/components/parent/CloudTab"));
const LazyHomeTab = lazy(() => import("@/components/parent/HomeTab"));

// ─── Tab config ─────────────────────────────────────────────────
const tabs: { id: Tab; icon: any; label: string }[] = [
  { id: "dashboard", icon: BarChart3, label: "Tableau" },
  { id: "sessions", icon: MessageSquare, label: "Sessions" },
  { id: "activites", icon: Gamepad2, label: "Activités" },
  { id: "personnalisation", icon: Settings, label: "Personnaliser Bobby" },
  { id: "cloud", icon: CloudUpload, label: "Cloud" },
  { id: "reglages", icon: Settings, label: "Réglages" },
  { id: "confidentialite", icon: Shield, label: "Privé" },
];

// ─── Suspense wrapper ───────────────────────────────────────────
const SuspenseTab = ({ children, label = "tab" }: { children: React.ReactNode; label?: string }) => (
  <LazyImportBoundary label={label}>
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
      {children}
    </Suspense>
  </LazyImportBoundary>
);

// ─── Props ──────────────────────────────────────────────────────
interface ParentModeProps {
  childName: string;
  onClose: () => void;
  parentSettings?: ParentSettings;
  onSettingsChange?: (settings: ParentSettings) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const ParentMode = ({ childName, onClose, parentSettings, onSettingsChange }: ParentModeProps) => {
  // ── Local UI state ──
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [displayedTab, setDisplayedTab] = useState<Tab>("home");
  const prevTabRef = useRef<Tab>("home");
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // ── Business hooks ──
  const data = useParentData({
    childName,
    parentSettings,
    onSettingsChange,
    onNavigateTab: useCallback((tab: string) => setActiveTab(tab as Tab), []),
  });

  const audio = useAudioPlayer(data.sessionMessages);

  // ── Tab sync ──
  useEffect(() => {
    if (activeTab === prevTabRef.current) return;
    setDisplayedTab(activeTab);
    prevTabRef.current = activeTab;
  }, [activeTab]);

  // Scroll to top on navigation
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab, data.reglagesSection, data.selectedSession]);

  // ── Back handler ──
  const handleBack = () => {
    if (data.selectedSession) {
      data.setSelectedSession(null);
      data.setSelectedAnalysis(null);
      data.setSessionMessages([]);
      audio.cleanup();
    } else if (activeTab !== "home") {
      setActiveTab("home");
    } else {
      onClose();
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // TAB ROUTER
  // ═══════════════════════════════════════════════════════════════

  const renderTabContent = () => {
    if (data.selectedSession) return (
      <SuspenseTab>
        <LazySessionDetailView
          session={data.selectedSession}
          analysis={data.selectedAnalysis || data.analyses.find(a => a.session_id === data.selectedSession!.id) || null}
          analyses={data.analyses}
          sessionMessages={data.sessionMessages}
          analyzing={data.analyzing}
          displayName={data.displayName}
          analyzeSession={data.analyzeSession}
          toggleFavorite={data.toggleFavorite}
          exportSessionPDF={data.exportSessionPDF}
          deleteSession={data.deleteSession}
          saveParentNote={data.saveParentNote}
          onCloudSave={data.handleCloudSave}
          setConfirmDialog={data.setConfirmDialog}
          playingAudio={audio.playingAudio}
          audioProgress={audio.audioProgress}
          audioDuration={audio.audioDuration}
          audioSpeed={audio.audioSpeed}
          activeMessageIdx={audio.activeMessageIdx}
          playAudio={audio.playAudio}
          seekAudio={audio.seekAudio}
          skipAudio={audio.skipAudio}
          setAudioSpeed={audio.setAudioSpeed}
        />
      </SuspenseTab>
    );

    const tab = displayedTab;

    if (tab === "home") return (
      <SuspenseTab>
        <LazyHomeTab
          sessions={data.sessions}
          analyses={data.analyses}
          displayName={data.displayName}
          cloudProfile={data.cloudProfile}
          unreadAlertCount={data.unreadAlertCount}
          onOpenNotifPanel={() => setShowNotifPanel(true)}
          onNavigate={setActiveTab}
        />
      </SuspenseTab>
    );

    switch (tab) {
      case "dashboard": return (
        <SuspenseTab>
          <LazyDashboardTab
            sessions={data.sessions} analyses={data.analyses} displayName={data.displayName}
            safetyAlerts={data.safetyAlerts} showSafetyAlerts={data.showSafetyAlerts}
            setShowSafetyAlerts={data.setShowSafetyAlerts}
            clearSafetyAlerts={data.clearSafetyAlerts}
          />
        </SuspenseTab>
      );
      case "sessions": return (
        <SuspenseTab>
          <LazySessionsListTab
            sessions={data.sessions} analyses={data.analyses} loading={data.loading}
            displayName={data.displayName} tagFilter={data.tagFilter} setTagFilter={data.setTagFilter}
            sessionFavFilter={data.sessionFavFilter} setSessionFavFilter={data.setSessionFavFilter}
            sessionSearch={data.sessionSearch} setSessionSearch={data.setSessionSearch}
            analyzeSession={data.analyzeSession} groupedSessions={data.groupedSessions}
          />
        </SuspenseTab>
      );
      case "activites": return <StoreGateWrapper childName={data.settings.childName} childAge={data.settings.childAge} />;
      case "profil":
      case "reglages": return (
        <SuspenseTab>
          <LazyReglagesTab
            settings={data.settings} sessions={data.sessions} childName={childName}
            allInterests={data.allInterests} settingsSaved={data.settingsSaved}
            reglagesSection={data.reglagesSection} setReglagesSection={data.setReglagesSection}
            onUpdate={data.updateSetting} onUpdateNested={data.updateNested}
            onSave={data.handleSave} onPendingNameChange={(name) => data.setPendingNameChange(name)}
          />
        </SuspenseTab>
      );
      case "personnalisation": return (
        <SuspenseTab>
          <LazyReglagesTab
            settings={data.settings} sessions={data.sessions} childName={childName}
            allInterests={data.allInterests} settingsSaved={data.settingsSaved}
            reglagesSection="personnalisation"
            setReglagesSection={(s) => { if (!s) setActiveTab("home"); else data.setReglagesSection(s); }}
            onUpdate={data.updateSetting} onUpdateNested={data.updateNested}
            onSave={data.handleSave} onPendingNameChange={(name) => data.setPendingNameChange(name)}
          />
        </SuspenseTab>
      );
      case "cloud": return (
        <SuspenseTab>
          <LazyCloudTab
            sessions={data.sessions} analyses={data.analyses} user={data.user}
            cloudProfile={data.cloudProfile} cloudLoading={data.cloudLoading}
            cloudCopied={data.cloudCopied} setCloudCopied={data.setCloudCopied}
            handleCloudSave={data.handleCloudSave} handleCloudDelete={data.handleCloudDelete}
            setConfirmDialog={data.setConfirmDialog}
          />
        </SuspenseTab>
      );
      case "confidentialite": return (
        <SuspenseTab>
          <LazyConfidentialiteTab
            settings={data.settings} sessions={data.sessions} analyses={data.analyses}
            displayName={data.displayName} childName={childName}
            onUpdate={data.updateSetting} setConfirmDialog={data.setConfirmDialog}
            setActiveTab={(t: string) => setActiveTab(t as Tab)} loadData={data.loadData}
          />
        </SuspenseTab>
      );
      default: return (
        <SuspenseTab>
          <LazyDashboardTab
            sessions={data.sessions} analyses={data.analyses} displayName={data.displayName}
            safetyAlerts={data.safetyAlerts} showSafetyAlerts={data.showSafetyAlerts}
            setShowSafetyAlerts={data.setShowSafetyAlerts}
            clearSafetyAlerts={data.clearSafetyAlerts}
          />
        </SuspenseTab>
      );
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col transition-colors duration-300 parent-light">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b-4 border-black">
        {(activeTab !== "home" || data.selectedSession) && (
          <button onClick={handleBack}
            className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center text-black hover:bg-muted transition-colors">
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
        )}
        <div className="flex-1">
          <h2 className="text-lg font-black text-black uppercase tracking-tight">
            {activeTab === "home" ? "BOBBY" : (tabs.find(t => t.id === activeTab)?.label || "BOBBY").toUpperCase()}
          </h2>
          <p className="text-[11px] text-muted-foreground font-bold">
            {data.selectedSession ? formatDate(data.selectedSession.started_at) : childName}
          </p>
        </div>
        {!data.selectedSession && (
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative w-9 h-9 border-2 border-black bg-white flex items-center justify-center text-black hover:bg-muted transition-all">
              <Bell className="w-4 h-4" />
              {data.unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                  {data.unreadAlertCount}
                </span>
              )}
            </button>
            <button onClick={() => { data.loadData(); data.loadAlerts(); }}
              className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center text-black">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Notification Panel */}
      {showNotifPanel && (
        <NotificationPanel
          alerts={data.parentAlerts}
          unreadCount={data.unreadAlertCount}
          sessions={data.sessions}
          onMarkRead={data.markAlertRead}
          onMarkAllRead={data.markAllRead}
          onSelectSession={(session) => { data.analyzeSession(session); setShowNotifPanel(false); }}
          onClose={() => setShowNotifPanel(false)}
        />
      )}

      {/* Content */}
      <div ref={contentScrollRef} data-scroll-container className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="tab-content-wrapper">
          {renderTabContent()}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!data.confirmDialog}
        title={data.confirmDialog?.title || ""}
        description={data.confirmDialog?.description || ""}
        confirmLabel={data.confirmDialog?.confirmLabel}
        variant={data.confirmDialog?.variant}
        onConfirm={() => data.confirmDialog?.onConfirm()}
        onCancel={() => data.setConfirmDialog(null)}
      />

      {/* Name Change Dialog */}
      {data.pendingNameChange !== null && (
        <NameChangeDialog
          pendingName={data.pendingNameChange}
          currentName={childName}
          onConfirm={(name) => { data.updateSetting("childName", name); data.setPendingNameChange(null); }}
          onCancel={() => data.setPendingNameChange(null)}
        />
      )}
    </div>
  );
};

export default ParentMode;
