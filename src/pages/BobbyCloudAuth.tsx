import { useState, useEffect } from "react";
import RetroLoader from "@/components/RetroLoader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { AuthStep } from "@/components/auth/authTypes";
import ChoiceScreen from "@/components/auth/ChoiceScreen";
import SignupInfoScreen from "@/components/auth/SignupInfoScreen";
import SignupPasswordScreen from "@/components/auth/SignupPasswordScreen";
import ConfirmEmailScreen from "@/components/auth/ConfirmEmailScreen";
import LoginScreen from "@/components/auth/LoginScreen";
import ForgotPasswordScreen from "@/components/auth/ForgotPasswordScreen";
import ForgotSentScreen from "@/components/auth/ForgotSentScreen";

export default function BobbyCloudAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";
  const { user, loading } = useAuth();

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
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    if (!loading && user) {
      const target = returnTo && returnTo !== "/" ? returnTo : "/store";
      navigate(target, { replace: true });
    }
  }, [loading, navigate, returnTo, user]);

  if (loading) {
    return <RetroLoader message="Connexion en cours…" />;
  }

  // ─── Handlers ──────────────────────────────────────
  const handleSignup = async () => {
    if (password !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas"); return; }
    if (password.length < 6) { toast.error("Le mot de passe doit faire au moins 6 caractères"); return; }
    if (!parentLastName.trim() || !parentFirstName.trim() || !email.trim()) { toast.error("Veuillez remplir tous les champs obligatoires"); return; }

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin + returnTo,
        data: { parent_last_name: parentLastName.trim(), parent_first_name: parentFirstName.trim(), emergency_phone: emergencyPhone.trim() },
      },
    });
    if (error) {
      if (error.message?.toLowerCase().includes("hibp") || error.message?.toLowerCase().includes("pwned") || error.message?.toLowerCase().includes("breached") || error.message?.toLowerCase().includes("leaked")) {
        toast.error("🔒 Ce mot de passe a été compromis lors d'une fuite de données connue. Choisissez un mot de passe plus sûr.", { duration: 6000 });
      } else {
        toast.error(error.message);
      }
    } else {
      setStep("confirm-email");
    }
    setSubmitting(false);
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) {
      toast.error(error.message);
    } else {
      if (data.user) {
        await supabase.from("profiles").update({
          parent_last_name: data.user.user_metadata?.parent_last_name || "",
          parent_first_name: data.user.user_metadata?.parent_first_name || "",
          emergency_phone: data.user.user_metadata?.emergency_phone || "",
        }).eq("user_id", data.user.id);
      }
      toast.success("Connecté !");
      navigate(returnTo, { replace: true });
    }
    setSubmitting(false);
  };

  const handleVerifyOtp = async () => {
    if (!confirmCode.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.auth.verifyOtp({ email, token: confirmCode.trim(), type: "signup" });
    if (error) {
      toast.error("Code invalide. Réessayez.");
    } else if (data.user) {
      await supabase.from("profiles").update({
        parent_last_name: parentLastName.trim(), parent_first_name: parentFirstName.trim(),
        email: email.trim(), emergency_phone: emergencyPhone.trim(),
      }).eq("user_id", data.user.id);
      toast.success("Compte Bobby Cloud créé ! 🎉");
      navigate(returnTo, { replace: true });
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { toast.error("Entrez votre email"); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    if (error) { toast.error(error.message); } else { setStep("forgot-sent"); }
    setSubmitting(false);
  };

  // ─── Step router ───────────────────────────────────
  switch (step) {
    case "choice":
      return <ChoiceScreen setStep={setStep} onBack={() => navigate(returnTo, { replace: true })} />;
    case "signup-info":
      return <SignupInfoScreen {...{ parentLastName, setParentLastName, parentFirstName, setParentFirstName, email, setEmail, emergencyPhone, setEmergencyPhone, setStep }} />;
    case "signup-password":
      return <SignupPasswordScreen {...{ password, setPassword, confirmPassword, setConfirmPassword, submitting, setStep }} onSignup={handleSignup} />;
    case "confirm-email":
      return <ConfirmEmailScreen {...{ email, confirmCode, setConfirmCode, submitting }} onVerify={handleVerifyOtp} />;
    case "login":
      return <LoginScreen {...{ loginEmail, setLoginEmail, loginPassword, setLoginPassword, submitting, setStep, setForgotEmail }} onLogin={handleLogin} />;
    case "forgot-password":
      return <ForgotPasswordScreen {...{ forgotEmail, setForgotEmail, submitting, setStep }} onForgot={handleForgotPassword} />;
    case "forgot-sent":
      return <ForgotSentScreen {...{ forgotEmail, setStep }} />;
    default:
      return null;
  }
}
