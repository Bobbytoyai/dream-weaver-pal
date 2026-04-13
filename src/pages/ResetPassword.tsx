import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase redirects with #access_token=... in the hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      // Also listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setReady(true);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleReset = async () => {
    if (password.length < 6) { toast.error("Minimum 6 caractères"); return; }
    if (password !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Mot de passe mis à jour ! 🎉");
      navigate("/bobby-cloud", { replace: true });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 parent-light" style={{ backgroundColor: "#FDF6EC" }}>
      <div
        className="w-full max-w-md p-6 border-4 border-black space-y-4"
        style={{ backgroundColor: "var(--retro-purple)", boxShadow: "6px 6px 0px rgba(0,0,0,0.3)" }}
      >
        <div className="text-center space-y-1">
          <span className="text-4xl block">🔐</span>
          <h2 className="text-xl font-black uppercase text-black">Nouveau mot de passe</h2>
          <p className="text-xs font-bold text-black/60">Choisissez votre nouveau mot de passe Bobby Cloud</p>
        </div>

        {!ready ? (
          <div className="text-center py-6">
            <p className="text-sm font-bold text-black/60 animate-pulse">Vérification du lien…</p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-black/70">Nouveau mot de passe</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoFocus
                className="w-full px-3 py-2.5 text-sm font-bold bg-white text-black outline-none focus:ring-2 focus:ring-black/20 placeholder:text-black/30"
                style={{ borderWidth: "3px", borderColor: "black", borderStyle: "solid" }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-black/70">Confirmer</label>
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm font-bold bg-white text-black outline-none focus:ring-2 focus:ring-black/20 placeholder:text-black/30"
                style={{ borderWidth: "3px", borderColor: "black", borderStyle: "solid" }}
              />
            </div>
            <button
              onClick={handleReset} disabled={submitting}
              className="w-full py-3 text-sm font-black uppercase bg-black text-white border-black transition-all active:scale-95 disabled:opacity-40"
              style={{ borderWidth: "3px", boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}
            >
              {submitting ? "Mise à jour…" : "Réinitialiser ✓"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
