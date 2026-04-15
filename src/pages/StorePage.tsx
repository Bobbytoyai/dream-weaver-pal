import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cloud } from "lucide-react";
import BobbyStore from "@/components/BobbyStore";

const StorePage = () => {
  const navigate = useNavigate();

  // Read child info from localStorage or use defaults
  const stored = (() => {
    try {
      const raw = localStorage.getItem("bobby_child_profile");
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  })();

  const childName = stored?.name || "Enfant";
  const childAge = stored?.age || 6;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF6EC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b-4 border-black bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-black text-black hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" /> Bobby
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-black">🛒 Bobby Store</span>
            <button
              onClick={() => navigate("/bobby-cloud")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase border-2 border-black bg-white text-black hover:bg-gray-100 transition-colors"
              style={{ boxShadow: "2px 2px 0px rgba(0,0,0,0.2)" }}
            >
              <Cloud className="w-3.5 h-3.5" /> Connexion Cloud
            </button>
          </div>
        </div>
      </nav>

      {/* STORE */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <BobbyStore childName={childName} childAge={childAge} />
      </div>
    </div>
  );
};

export default StorePage;
