import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Accueil", path: "/", emoji: "🏠", bg: "var(--retro-yellow)" },
  { label: "Précommande", path: "/precommande", emoji: "🛒", bg: "var(--retro-red)" },
  { label: "Technologie", path: "/technologie", emoji: "🧠", bg: "var(--retro-blue)" },
  { label: "Fonctionnalités", path: "/fonctionnalites", emoji: "⚡", bg: "var(--retro-purple)" },
  { label: "Sécurité", path: "/securite", emoji: "🛡️", bg: "var(--retro-green)" },
  { label: "Bobby Store", path: "/store", emoji: "🏪", bg: "var(--retro-yellow)" },
  { label: "Guide", path: "/guide", emoji: "📖", bg: "var(--retro-blue)" },
  { label: "FAQ", path: "/faq", emoji: "❓", bg: "var(--retro-purple)" },
  { label: "Contact", path: "/contact", emoji: "✉️", bg: "var(--retro-green)" },
  { label: "Mentions légales", path: "/mentions-legales", emoji: "📜", bg: "var(--retro-yellow)" },
];

export default function RetroMobileNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-10 h-10 border-3 border-black bg-white hover:bg-gray-100 transition-colors"
        style={{ borderWidth: "3px", boxShadow: "3px 3px 0 rgba(0,0,0,0.2)" }}
        aria-label="Menu"
      >
        <Menu className="w-5 h-5 text-black" />
      </button>

      {/* Overlay + Drawer */}
      {open && (
        <div className="fixed inset-0 z-[998] flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            className="relative z-10 w-[280px] max-w-[85vw] h-full overflow-y-auto border-r-4 border-black animate-in slide-in-from-left duration-200"
            style={{ backgroundColor: "#FDF6EC" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-4 border-black">
              <span className="font-black text-black text-lg tracking-tight">BOBBY</span>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Links */}
            <nav className="p-3 space-y-2">
              {NAV_ITEMS.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-3 border-black text-left font-black text-sm text-black transition-all hover:translate-x-1 ${active ? "translate-x-1 scale-[1.02]" : ""}`}
                    style={{
                      borderWidth: "3px",
                      backgroundColor: active ? item.bg : item.bg + "40",
                      boxShadow: active ? "4px 4px 0 rgba(0,0,0,0.25)" : "2px 2px 0 rgba(0,0,0,0.1)",
                    }}
                  >
                    <span className="text-xl">{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 mt-4 border-t-4 border-black">
              <p className="text-[9px] font-black text-black/40 text-center">© 2026 OSAI × Silverlit</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
