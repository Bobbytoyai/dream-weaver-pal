import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

type AuthStep = "choice" | "signup-info" | "signup-password" | "confirm-email" | "login";

export default function BobbyCloudAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [step, setStep] = useState<AuthStep>("choice");
  const [submitting, setSubmitting] = useState(false);

  // Signup fields
  const [parentLastName, setParentLastName] = useState("");
  const [parentFirstName, setParentFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Check if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(returnTo, { replace: true });
    });
  }, []);

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit faire au moins 6 caractères");
      return;
    }
    if (!parentLastName.trim() || !parentFirstName.trim() || !email.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + returnTo,
        data: {
          parent_last_name: parentLastName.trim(),
          parent_first_name: parentFirstName.trim(),
          emergency_phone: emergencyPhone.trim(),
        },
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      setStep("confirm-email");
    }
    setSubmitting(false);
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      toast.error(error.message);
    } else {
      // Update profile with parent info if not set
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            parent_last_name: user.user_metadata?.parent_last_name || "",
            parent_first_name: user.user_metadata?.parent_first_name || "",
            emergency_phone: user.user_metadata?.emergency_phone || "",
          })
          .eq("user_id", user.id);
      }
      toast.success("Connecté !");
      navigate(returnTo, { replace: true });
    }
    setSubmitting(false);
  };

  const handleVerifyOtp = async () => {
    if (!confirmCode.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: confirmCode.trim(),
      type: "signup",
    });
    if (error) {
      toast.error("Code invalide. Réessayez.");
    } else if (data.user) {
      // Save parent info to profile
      await supabase
        .from("profiles")
        .update({
          parent_last_name: parentLastName.trim(),
          parent_first_name: parentFirstName.trim(),
          email: email.trim(),
          emergency_phone: emergencyPhone.trim(),
        })
        .eq("user_id", data.user.id);

      toast.success("Compte Bobby Cloud créé ! 🎉");
      navigate(returnTo, { replace: true });
    }
    setSubmitting(false);
  };

  // ─── Retro card wrapper ─────────────────────────────
  const RetroCard = ({ children, color = "var(--retro-blue)" }: { children: React.ReactNode; color?: string }) => (
    <div className="min-h-screen flex items-center justify-center p-4 parent-light" style={{ backgroundColor: "#FDF6EC" }}>
      <div
        className="w-full max-w-md p-6 border-4 border-black"
        style={{ backgroundColor: color, boxShadow: "6px 6px 0px rgba(0,0,0,0.3)" }}
      >
        {children}
      </div>
    </div>
  );

  const RetroInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="space-y-1">
      <label className="text-xs font-black uppercase text-black/70">{label}</label>
      <input
        {...props}
        className="w-full px-3 py-2.5 text-sm font-bold border-3 border-black bg-white text-black outline-none focus:ring-2 focus:ring-black/20 placeholder:text-black/30"
        style={{ borderWidth: "3px" }}
      />
    </div>
  );

  const RetroButton = ({ children, disabled, onClick, variant = "primary" }: {
    children: React.ReactNode; disabled?: boolean; onClick?: () => void; variant?: "primary" | "secondary"
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3 text-sm font-black uppercase border-3 border-black transition-all active:scale-95 disabled:opacity-40 ${
        variant === "primary"
          ? "bg-black text-white hover:opacity-90"
          : "bg-white text-black hover:bg-gray-100"
      }`}
      style={{ borderWidth: "3px", boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}
    >
      {children}
    </button>
  );

  // ─── Choice screen ─────────────────────────────────
  if (step === "choice") {
    return (
      <RetroCard color="var(--retro-blue)">
        <div className="text-center space-y-5">
          <div className="space-y-2">
            <span className="text-6xl block">☁️</span>
            <h1 className="text-2xl font-black uppercase text-black">Bobby Cloud</h1>
            <p className="text-xs font-bold text-black/60">
              Créez votre compte pour accéder au Bobby Store, sauvegarder et synchroniser les données de Bobby.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <RetroButton onClick={() => setStep("signup-info")}>
              Créer mon compte 🚀
            </RetroButton>
            <RetroButton variant="secondary" onClick={() => setStep("login")}>
              J'ai déjà un compte
            </RetroButton>
          </div>

          <button
            onClick={() => navigate(returnTo, { replace: true })}
            className="text-xs font-bold text-black/40 hover:text-black/60 underline"
          >
            Plus tard
          </button>
        </div>
      </RetroCard>
    );
  }

  // ─── Signup info ───────────────────────────────────
  if (step === "signup-info") {
    return (
      <RetroCard color="var(--retro-green)">
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <span className="text-4xl block">👨‍👩‍👧</span>
            <h2 className="text-xl font-black uppercase text-black">Informations Parent</h2>
            <p className="text-xs font-bold text-black/60">Ces infos restent confidentielles</p>
          </div>

          <RetroInput label="Nom de famille *" value={parentLastName} onChange={e => setParentLastName(e.target.value)} placeholder="Dupont" required />
          <RetroInput label="Prénom parent *" value={parentFirstName} onChange={e => setParentFirstName(e.target.value)} placeholder="Marie" required />
          <RetroInput label="Adresse email *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="parent@email.com" required />
          <RetroInput label="Téléphone d'urgence" type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="06 12 34 56 78" />

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep("choice")}
              className="px-4 py-3 text-xs font-black uppercase border-3 border-black bg-white text-black hover:bg-gray-100 active:scale-95"
              style={{ borderWidth: "3px", boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}
            >
              ← Retour
            </button>
            <div className="flex-1">
              <RetroButton
                onClick={() => {
                  if (!parentLastName.trim() || !parentFirstName.trim() || !email.trim()) {
                    toast.error("Remplissez les champs obligatoires (*)");
                    return;
                  }
                  setStep("signup-password");
                }}
              >
                Suivant →
              </RetroButton>
            </div>
          </div>
        </div>
      </RetroCard>
    );
  }

  // ─── Signup password ───────────────────────────────
  if (step === "signup-password") {
    return (
      <RetroCard color="var(--retro-purple)">
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <span className="text-4xl block">🔐</span>
            <h2 className="text-xl font-black uppercase text-black">Mot de passe</h2>
            <p className="text-xs font-bold text-black/60">Minimum 6 caractères</p>
          </div>

          <RetroInput label="Mot de passe *" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          <RetroInput label="Confirmer le mot de passe *" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />

          <div className="p-3 bg-white/50 border-2 border-black/20">
            <p className="text-xs font-bold text-black/70">
              ☁️ Votre compte Bobby Cloud inclut <strong>500 Mo</strong> de stockage gratuit pour sauvegarder les données de Bobby.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep("signup-info")}
              className="px-4 py-3 text-xs font-black uppercase border-3 border-black bg-white text-black hover:bg-gray-100 active:scale-95"
              style={{ borderWidth: "3px", boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}
            >
              ← Retour
            </button>
            <div className="flex-1">
              <RetroButton onClick={handleSignup} disabled={submitting}>
                {submitting ? "Envoi…" : "Créer le compte 🎉"}
              </RetroButton>
            </div>
          </div>
        </div>
      </RetroCard>
    );
  }

  // ─── Email confirmation ────────────────────────────
  if (step === "confirm-email") {
    return (
      <RetroCard color="var(--retro-yellow)">
        <div className="space-y-5 text-center">
          <div className="space-y-2">
            <span className="text-5xl block">📬</span>
            <h2 className="text-xl font-black uppercase text-black">Vérification Email</h2>
            <p className="text-sm font-bold text-black/70">
              Un code de confirmation a été envoyé à <br />
              <span className="text-black underline">{email}</span>
            </p>
          </div>

          <RetroInput
            label="Code de confirmation"
            value={confirmCode}
            onChange={e => setConfirmCode(e.target.value)}
            placeholder="123456"
            autoFocus
          />

          <RetroButton onClick={handleVerifyOtp} disabled={submitting || !confirmCode.trim()}>
            {submitting ? "Vérification…" : "Confirmer ✓"}
          </RetroButton>

          <button
            onClick={() => {
              supabase.auth.resend({ type: "signup", email });
              toast.success("Email renvoyé !");
            }}
            className="text-xs font-bold text-black/50 hover:text-black/70 underline"
          >
            Renvoyer le code
          </button>
        </div>
      </RetroCard>
    );
  }

  // ─── Login ─────────────────────────────────────────
  if (step === "login") {
    return (
      <RetroCard color="var(--retro-blue)">
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <span className="text-4xl block">🔑</span>
            <h2 className="text-xl font-black uppercase text-black">Connexion</h2>
            <p className="text-xs font-bold text-black/60">Accédez à votre compte Bobby Cloud</p>
          </div>

          <RetroInput label="Email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="parent@email.com" autoFocus />
          <RetroInput label="Mot de passe" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" />

          <RetroButton onClick={handleLogin} disabled={submitting}>
            {submitting ? "Connexion…" : "Se connecter →"}
          </RetroButton>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setStep("choice")}
              className="flex-1 py-2 text-xs font-black text-black/50 hover:text-black/70 underline"
            >
              ← Retour
            </button>
            <button
              onClick={() => setStep("signup-info")}
              className="flex-1 py-2 text-xs font-black text-black/50 hover:text-black/70 underline"
            >
              Créer un compte
            </button>
          </div>
        </div>
      </RetroCard>
    );
  }

  return null;
}
