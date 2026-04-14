import React from "react";

export const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!value)}
    className={`relative w-12 h-7 border-4 border-black transition-all duration-300 ${value ? "bg-foreground" : "bg-white"}`}>
    <div className={`w-4 h-4 bg-white border-2 border-black transition-all duration-300 ${value ? "translate-x-5 bg-[var(--retro-green)]" : "translate-x-0.5"}`} style={{ marginTop: "-2px" }} />
  </button>
);

export const SettingRow = ({ icon: Icon, title, desc, children }: {
  icon: any; title: string; desc?: string; children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-3 px-1 border-b-2 border-black/10 last:border-0">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-black" />
      </div>
      <div className="min-w-0">
        <h4 className="text-[14px] font-black text-black uppercase">{title}</h4>
        {desc && <p className="text-[12px] text-black/60 leading-tight mt-0.5 font-bold">{desc}</p>}
      </div>
    </div>
    <div className="shrink-0 ml-3">{children}</div>
  </div>
);

export const Card = ({ title, icon: Icon, children, noPad, className: cx }: { title?: string; icon?: any; children: React.ReactNode; noPad?: boolean; className?: string }) => (
  <div className={`retro-card overflow-hidden ${cx || ""}`}>
    {title && (
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
        {Icon && <div className="w-8 h-8 bg-black flex items-center justify-center"><Icon className="w-4 h-4 text-white" /></div>}
        <h3 className="text-[15px] font-black text-black tracking-tight uppercase">{title}</h3>
      </div>
    )}
    <div className={noPad ? "" : "px-5 pb-4"}>{children}</div>
  </div>
);

export const ScoreGauge = ({ label, score, emoji, color, size = "md" }: { label: string; score: number; emoji: string; color: string; size?: "sm" | "md" | "lg" }) => {
  const dims = size === "lg" ? "w-20 h-20" : size === "sm" ? "w-12 h-12" : "w-14 h-14";
  const textSize = size === "lg" ? "text-lg" : "text-sm";
  const labelSize = size === "lg" ? "text-[11px]" : "text-[10px]";
  const scoreLevel = score >= 75 ? "Excellent" : score >= 50 ? "Bien" : score >= 30 ? "À suivre" : "Faible";
  const levelColor = score >= 75 ? "text-green-600" : score >= 50 ? "text-primary" : score >= 30 ? "text-orange-500" : "text-destructive";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${dims}`}>
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831"
            fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
          <path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831"
            fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score}, 100`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base">{emoji}</span>
      </div>
      <span className={`${labelSize} text-muted-foreground font-medium text-center`}>{label}</span>
      <span className={`${textSize} font-bold text-black`}>{score}</span>
      {size === "lg" && <span className={`text-[9px] font-semibold ${levelColor}`}>{scoreLevel}</span>}
    </div>
  );
};

export const StatPill = ({ emoji, value, label }: { emoji: string; value: string | number; label: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-xl">{emoji}</span>
    <span className="text-lg font-bold text-black">{value}</span>
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);
