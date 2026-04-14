import React from "react";

export const RetroCard = ({ children, color = "var(--retro-blue)" }: { children: React.ReactNode; color?: string }) => (
  <div className="min-h-screen flex items-center justify-center p-4 parent-light" style={{ backgroundColor: "#FDF6EC" }}>
    <div
      className="w-full max-w-md p-6 border-4 border-black"
      style={{ backgroundColor: color, boxShadow: "6px 6px 0px rgba(0,0,0,0.3)" }}
    >
      {children}
    </div>
  </div>
);

export const RetroInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1">
    <label className="text-xs font-black uppercase text-black/70">{label}</label>
    <input
      {...props}
      className="w-full px-3 py-2.5 text-sm font-bold border-3 border-black bg-white text-black outline-none focus:ring-2 focus:ring-black/20 placeholder:text-black/30 select-text"
      style={{ borderWidth: "3px", WebkitUserSelect: "text", userSelect: "text" }}
      autoComplete={props.type === "password" ? "new-password" : props.autoComplete || "on"}
      onFocus={e => e.target.select()}
    />
  </div>
);

export const RetroButton = ({ children, disabled, onClick, variant = "primary" }: {
  children: React.ReactNode; disabled?: boolean; onClick?: () => void; variant?: "primary" | "secondary"
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full py-3 text-sm font-black uppercase border-3 border-black transition-all disabled:opacity-40 ${
      variant === "primary"
        ? "bg-black text-white hover:opacity-90"
        : "bg-white text-black hover:bg-gray-100"
    }`}
    style={{ borderWidth: "3px", boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}
  >
    {children}
  </button>
);

export const RetroBackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="px-4 py-3 text-xs font-black uppercase border-3 border-black bg-white text-black hover:bg-gray-100"
    style={{ borderWidth: "3px", boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}
  >
    ← Retour
  </button>
);
