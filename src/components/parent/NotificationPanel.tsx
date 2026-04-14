import React from "react";
import { Bell, X } from "lucide-react";
import type { Session } from "./parentTypes";

interface ParentAlert {
  id: string; session_id: string; child_name: string; alert_type: string;
  severity: string; message: string; context: string | null; is_read: boolean; created_at: string;
}

interface NotificationPanelProps {
  alerts: ParentAlert[];
  unreadCount: number;
  sessions: Session[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectSession: (session: Session) => void;
  onClose: () => void;
}

const severityConfig: Record<string, { icon: string; bg: string }> = {
  critical: { icon: "🚨", bg: "bg-[var(--retro-red)]" },
  high: { icon: "⚠️", bg: "bg-[var(--retro-orange)]" },
  medium: { icon: "🔔", bg: "bg-[var(--retro-yellow)]" },
  low: { icon: "ℹ️", bg: "bg-white" },
};

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `il y a ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)}j`;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  alerts, unreadCount, sessions, onMarkRead, onMarkAllRead, onSelectSession, onClose,
}) => (
  <div className="absolute top-14 right-2 z-50 w-80 max-h-96 bg-white border-4 border-black overflow-hidden"
    style={{ boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}>
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-black" />
        <h3 className="text-[13px] font-black text-black uppercase">Notifications</h3>
        {unreadCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 border-2 border-black bg-[var(--retro-red)] text-black font-black">{unreadCount}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {unreadCount > 0 && (
          <button onClick={onMarkAllRead} className="text-[10px] text-black font-black hover:underline uppercase">
            Tout lu
          </button>
        )}
        <button onClick={onClose} className="w-7 h-7 border border-black flex items-center justify-center text-black hover:bg-[var(--retro-yellow)]">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    {/* List */}
    <div className="overflow-y-auto max-h-72">
      {alerts.length === 0 ? (
        <div className="p-6 text-center">
          <span className="text-2xl">✅</span>
          <p className="text-[12px] text-black/60 mt-2 font-bold">Aucune alerte</p>
        </div>
      ) : (
        alerts.slice(0, 20).map(alert => {
          const cfg = severityConfig[alert.severity] || severityConfig.medium;
          return (
            <button key={alert.id}
              onClick={() => {
                onMarkRead(alert.id);
                const session = sessions.find(s => s.id === alert.session_id);
                if (session) onSelectSession(session);
              }}
              className={`w-full text-left px-4 py-3 border-b-2 border-black/15 ${!alert.is_read ? cfg.bg : ""} hover:bg-[var(--retro-yellow)] transition-colors`}>
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] ${!alert.is_read ? "font-black text-black" : "font-bold text-black/60"} line-clamp-2`}>
                    {alert.message}
                  </p>
                  <p className="text-[10px] text-black/50 mt-0.5 font-bold">{alert.child_name} • {timeAgo(alert.created_at)}</p>
                </div>
                {!alert.is_read && <span className="w-2 h-2 bg-foreground mt-1.5 shrink-0" />}
              </div>
            </button>
          );
        })
      )}
    </div>
  </div>
);

export default NotificationPanel;
