import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import RetroLoader from "@/components/RetroLoader";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";

const Index = lazy(() => import("./pages/Index.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const BobbyQR = lazy(() => import("./pages/BobbyQR.tsx"));
const BobbyCloudAuth = lazy(() => import("./pages/BobbyCloudAuth.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

// Fix: clear any orphaned auth locks on startup so Supabase queries don't hang
try {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("lock:sb-") && k.endsWith("-auth-token")) {
      try { localStorage.removeItem(k); } catch {}
    }
  });
} catch {}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RetroLoader />}>
            <Routes>
              {/* Bobby accessible sans auth — QR code only */}
              <Route path="/" element={<Index />} />
              <Route path="/b/:code" element={<BobbyQR />} />
              
              {/* Cloud auth dédié */}
              <Route path="/bobby-cloud" element={<BobbyCloudAuth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Admin (pas de gate, vérification interne) */}
              <Route path="/admin" element={<Admin />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
