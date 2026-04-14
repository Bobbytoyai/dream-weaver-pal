import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import LazyImportBoundary from "@/components/LazyImportBoundary";
import BobbyErrorBoundary from "@/components/BobbyErrorBoundary";
import RetroLoader from "@/components/RetroLoader";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";

// Index is NOT lazy — it's the Bobby LCD, must never show loading/error UI
import Index from "./pages/Index";

const Admin = lazy(() => import("./pages/Admin.tsx"));
const BobbyQR = lazy(() => import("./pages/BobbyQR.tsx"));
const BobbyParent = lazy(() => import("./pages/BobbyParent.tsx"));
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
          <Routes>
            {/* Bobby LCD — dedicated error boundary, no lazy loading, no loader */}
            <Route path="/" element={
              <BobbyErrorBoundary>
                <Index />
              </BobbyErrorBoundary>
            } />
            
            {/* All other routes — lazy loaded with standard error boundary */}
            <Route path="*" element={
              <LazyImportBoundary label="route">
                <Suspense fallback={<RetroLoader />}>
                  <Routes>
                    <Route path="/b/:code" element={<BobbyQR />} />
                    <Route path="/parent/:code" element={<BobbyParent />} />
                    <Route path="/bobby-cloud" element={<BobbyCloudAuth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </LazyImportBoundary>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
