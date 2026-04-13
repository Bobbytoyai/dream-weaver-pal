import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

const Index = lazy(() => import("./pages/Index.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const BobbyQR = lazy(() => import("./pages/BobbyQR.tsx"));
const BobbyCloudAuth = lazy(() => import("./pages/BobbyCloudAuth.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a2e] to-[#1a1a4e]">
      <div className="text-white text-lg animate-pulse">Chargement…</div>
    </div>
  );
}

// Fix: clear any orphaned auth locks on startup so Supabase queries don't hang
try {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("lock:sb-") && k.endsWith("-auth-token")) {
      try { localStorage.removeItem(k); } catch {}
    }
  });
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
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/bobby-cloud" element={<BobbyCloudAuth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/b/:code" element={<BobbyQR />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
