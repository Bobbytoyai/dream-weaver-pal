import { useNavigate } from "react-router-dom";

export default function InvalidScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-4"
        style={{ boxShadow: "6px 6px 0 hsl(var(--foreground)/0.2)" }}>
        <span className="text-5xl block">❌</span>
        <h2 className="text-xl font-black text-black uppercase">Code parent invalide</h2>
        <p className="text-sm font-bold text-muted-foreground">
          Ce QR code parent n'existe pas, n'est plus actif, ou le Bobby associé n'a pas encore été activé.
        </p>
        <button onClick={() => navigate("/")}
          className="w-full py-3 text-sm font-black uppercase border-4 border-foreground bg-primary text-primary-foreground hover:opacity-90 transition-all"
          style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}>
          ← Retour
        </button>
      </div>
    </div>
  );
}
