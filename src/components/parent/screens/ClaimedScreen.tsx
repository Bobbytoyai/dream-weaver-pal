import { useNavigate } from "react-router-dom";

export default function ClaimedScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-6">
      <div className="w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-5"
        style={{ boxShadow: "6px 6px 0 hsl(var(--foreground)/0.2)" }}>
        <div className="mx-auto w-20 h-20 border-4 border-foreground bg-orange-100 flex items-center justify-center rounded-xl">
          <span className="text-5xl">🔒</span>
        </div>
        <h2 className="text-xl font-black text-black uppercase leading-tight">
          Accès parent déjà lié
        </h2>
        <p className="text-[13px] font-bold text-muted-foreground leading-relaxed">
          Ce code parent est <strong>définitivement lié</strong> à un autre appareil.
          Pour des raisons de sécurité, le Mode Parent est accessible uniquement depuis l'appareil qui l'a activé en premier.
        </p>
        <div className="border-4 border-foreground bg-amber-50 p-3 text-left space-y-1 rounded-lg">
          <p className="text-[11px] font-black text-black uppercase">💡 Besoin d'aide ?</p>
          <p className="text-[10px] font-bold text-muted-foreground">
            Contacte le support Bobby avec ta preuve d'achat pour obtenir un nouveau code parent.
          </p>
        </div>
        <button onClick={() => navigate("/")}
          className="w-full py-3 text-sm font-black uppercase border-4 border-foreground bg-primary text-primary-foreground hover:opacity-90 transition-all"
          style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}>
          ← Retour
        </button>
      </div>
    </div>
  );
}
