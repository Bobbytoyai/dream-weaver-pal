import BobbyStore from "@/components/BobbyStore";
import { useAuth } from "@/hooks/useAuth";

interface StoreGateWrapperProps {
  childName: string;
  childAge: number;
}

export default function StoreGateWrapper({ childName, childAge }: StoreGateWrapperProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="text-3xl animate-bounce">🏪</div>
          <p className="text-sm font-bold text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 space-y-6">
        <div
          className="p-6 border-4 border-black text-center space-y-4"
          style={{ backgroundColor: "var(--retro-yellow)", boxShadow: "5px 5px 0px rgba(0,0,0,0.25)" }}
        >
          <span className="text-5xl block">🔒</span>
          <h3 className="text-xl font-black uppercase text-black">Bobby Store</h3>
          <p className="text-sm font-bold text-black/70">
            Pour accéder au Bobby Store et installer des packs de contenu, vous devez créer un compte Bobby Cloud gratuit.
          </p>
          <div className="space-y-2 pt-2">
            <a
              href={`/bobby-cloud?returnTo=${encodeURIComponent(window.location.pathname)}`}
              className="block w-full py-3 text-sm font-black uppercase border-3 border-black bg-black text-white hover:opacity-90 active:scale-95 transition-all text-center"
              style={{ borderWidth: "3px", boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}
            >
              Créer mon compte ☁️
            </a>
            <a
              href={`/bobby-cloud?returnTo=${encodeURIComponent(window.location.pathname)}`}
              className="block w-full py-3 text-sm font-black uppercase border-3 border-black bg-white text-black hover:bg-gray-100 active:scale-95 transition-all text-center"
              style={{ borderWidth: "3px", boxShadow: "3px 3px 0px rgba(0,0,0,0.15)" }}
            >
              J'ai déjà un compte
            </a>
          </div>
        </div>

        <div className="p-4 border-2 border-black/20 bg-white/50 space-y-2">
          <p className="text-xs font-black uppercase text-black/60">☁️ Bobby Cloud inclut :</p>
          <ul className="text-xs font-bold text-black/50 space-y-1">
            <li>✓ 500 Mo de stockage gratuit</li>
            <li>✓ Accès au Bobby Store</li>
            <li>✓ Synchronisation multi-appareils</li>
            <li>✓ Sauvegarde des données de Bobby</li>
          </ul>
        </div>
      </div>
    );
  }

  return <BobbyStore childName={childName} childAge={childAge} />;
}
