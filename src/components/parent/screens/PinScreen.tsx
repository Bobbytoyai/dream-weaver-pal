import { useState } from "react";

interface PinScreenProps {
  savedPin: string;
  onSuccess: () => void;
}

export default function PinScreen({ savedPin, onSuccess }: PinScreenProps) {
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const handleSubmit = () => {
    if (!savedPin || savedPin === "" || pinInput === savedPin) {
      onSuccess();
    } else {
      setPinError(true);
      setPinInput("");
      setTimeout(() => setPinError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-5"
        style={{ boxShadow: "6px 6px 0 hsl(var(--foreground)/0.2)" }}>
        <span className="text-5xl block">🔐</span>
        <h2 className="text-xl font-black text-black uppercase">Code PIN Parent</h2>
        <p className="text-sm font-bold text-muted-foreground">
          Entrez votre code PIN pour accéder au Mode Parent.
        </p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pinInput}
          onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
          autoFocus
          className={`w-full px-4 py-3 text-2xl font-black text-center tracking-[0.5em] border-4 bg-white outline-none ${
            pinError ? "border-destructive" : "border-foreground"
          }`}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
        />
        {pinError && (
          <p className="text-destructive text-sm font-black">
            ❌ Code PIN incorrect
          </p>
        )}
        <button onClick={handleSubmit}
          disabled={pinInput.length === 0}
          className="w-full py-3 text-sm font-black uppercase border-4 border-foreground bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40"
          style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}>
          Valider →
        </button>
      </div>
    </div>
  );
}
