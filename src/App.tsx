import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Admin from "./pages/Admin.tsx";
import Auth from "./pages/Auth.tsx";
import BobbyQR from "./pages/BobbyQR.tsx";
import BobbyCloudAuth from "./pages/BobbyCloudAuth.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// Fix: clear any orphaned auth locks on startup so Supabase queries don't hang
try {
  Object.keys(localStorage).forEach(k => {
    if (k.includes("auth-token-code-verifier") || k.includes("supabase.auth.token")) {
      try { localStorage.removeItem(k); } catch {}
    }
  });
  supabase.auth.getSession().catch(() => {});
} catch {}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a2e] to-[#1a1a4e]">
        <div className="text-white text-lg animate-pulse">Chargement…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/bobby-cloud" element={<BobbyCloudAuth />} />
            <Route path="/b/:code" element={<BobbyQR />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
