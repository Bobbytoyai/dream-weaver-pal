import { useNavigate } from "react-router-dom";

export default function NotActivatedScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-6">
      <div className="w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-5"
        style={{ boxShadow: "6px 6px 0 hsl(var(--foreground)/0.2)" }}>
        <span className="text-5xl block">🤖💤</span>
        <h2 className="text-xl font-black text-foreground uppercase leading-tight">Bobby pas encore activé</h2>
        <p className="text-sm font-bold text-muted-foreground leading-relaxed">
          Le Bobby associé à ce code parent <strong>n'a pas encore été scanné</strong> par un enfant.
        </p>
        <div className="border-4 border-foreground bg-amber-50 p-3 text-left space-y-1 rounded-lg">
          <p className="text-[11px] font-black text-foreground uppercase">📱 Comment faire ?</p>
          <p className="text-[10px] font-bold text-muted-foreground">
            Scanne d'abord le QR code Bobby (celui de l'enfant) pour activer le jouet, puis reviens scanner ce QR code parent.
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
