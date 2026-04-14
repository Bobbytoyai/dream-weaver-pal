import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { KBEntry } from "./adminConfig";
import type { BobbyInteraction } from "@/lib/bobby_interactions_10k";

export function DashCard({ label, emoji, count, desc, color, bgColor, onClick, badge }: {
  label: string; emoji: string; count: string | number; desc: string;
  color: string; bgColor: string; onClick: () => void; badge?: string;
}) {
  return (
    <button onClick={onClick}
      className="rounded-2xl p-3 transition-all duration-200 text-left flex items-center gap-3 group w-full"
      style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}
    >
      <div className={`w-10 h-10 shrink-0 rounded-xl ${bgColor} flex items-center justify-center`}>
        <span className="text-xl">{emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`text-[13px] font-bold ${color} truncate`}>{label}</h3>
          {badge && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold shrink-0">{badge}</span>}
        </div>
        <p className="text-[10px] truncate leading-tight" style={{ color: "var(--admin-text-dim)" }}>{desc}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[18px] font-bold tabular-nums" style={{ color: "var(--admin-text)" }}>{count}</p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-colors" style={{ color: "var(--admin-text-faint)" }} />
    </button>
  );
}

export function InteractionCard({ interaction }: { interaction: BobbyInteraction }) {
  return (
    <div className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/[0.06] hover:bg-white/[0.06] transition-all">
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className="text-[10px] px-2.5 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 font-semibold">{interaction.category}</span>
        <span className="text-[10px] px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-300 font-semibold">{interaction.age} ans</span>
        <span className="text-[10px] px-2.5 py-1 rounded-xl bg-pink-500/15 text-pink-300 font-semibold">{interaction.emotion}</span>
        <span className="text-[10px] text-white/20 ml-auto font-mono">Niv.{interaction.difficulty_level}</span>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2.5">
          <span className="text-[11px] shrink-0 mt-0.5">👦</span>
          <p className="text-[13px] text-white/80 leading-relaxed">{interaction.child_input}</p>
        </div>
        <div className="flex gap-2.5">
          <span className="text-[11px] shrink-0 mt-0.5">🤖</span>
          <p className="text-[13px] text-white/50 leading-relaxed">{interaction.ai_response}</p>
        </div>
      </div>
    </div>
  );
}

export function EntryRow({ entry, onToggle, onEdit, onDelete }: {
  entry: KBEntry; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className={`bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border transition-all ${entry.is_active ? "border-white/[0.06]" : "border-red-500/20 opacity-40"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-mono font-bold">P{entry.priority}</span>
            <span className="text-[10px] text-white/30">{entry.age_min}-{entry.age_max} ans</span>
            <span className="text-[10px] text-white/20">🔄 {entry.usage_count || 0}</span>
          </div>
          <p className="text-white font-medium text-[13px] leading-relaxed">{entry.question}</p>
          <p className="text-white/30 text-[12px] mt-1 line-clamp-2">{entry.answer}</p>
          {entry.keywords.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {entry.keywords.slice(0, 6).map((k, i) => (
                <span key={i} className="text-[9px] px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">{k}</span>
              ))}
              {entry.keywords.length > 6 && <span className="text-[10px] text-white/20">+{entry.keywords.length - 6}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Switch checked={entry.is_active} onCheckedChange={onToggle} className="scale-75" />
          <Button size="icon" variant="ghost" onClick={onEdit} className="text-white/30 hover:text-blue-400 w-8 h-8">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} className="text-white/30 hover:text-red-400 w-8 h-8">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
