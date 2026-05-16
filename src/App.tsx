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

// Landing is light — import directly for fast first paint
import Landing from "./pages/Landing";

// Bobby LCD (voice screen) is now lazy-loaded at /app
const Index = lazy(() => import("./pages/Index"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const BobbyQR = lazy(() => import("./pages/BobbyQR.tsx"));
const BobbyParent = lazy(() => import("./pages/BobbyParent.tsx"));
const BobbyCloudAuth = lazy(() => import("./pages/BobbyCloudAuth.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const ParentTest = lazy(() => import("./pages/ParentTest.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Technologie = lazy(() => import("./pages/Technologie.tsx"));
const Fonctionnalites = lazy(() => import("./pages/Fonctionnalites.tsx"));
const Securite = lazy(() => import("./pages/Securite.tsx"));
const Guide = lazy(() => import("./pages/Guide.tsx"));
const FAQ = lazy(() => import("./pages/FAQ.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales.tsx"));
const StorePage = lazy(() => import("./pages/StorePage.tsx"));
const Precommande = lazy(() => import("./pages/Precommande.tsx"));
const FaceTest = lazy(() => import("./pages/FaceTest.tsx"));
const Debug = lazy(() => import("./pages/Debug.tsx"));

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
            {/* Landing page — bobby-toy.shop */}
            <Route path="/" element={<Landing />} />

            {/* Bobby LCD — moved to /app */}
            <Route path="/app" element={
              <BobbyErrorBoundary>
                <Suspense fallback={<RetroLoader />}>
                  <Index />
                </Suspense>
              </BobbyErrorBoundary>
            } />
            
            {/* All other routes — lazy loaded with standard error boundary */}
            <Route path="*" element={
              <LazyImportBoundary label="route">
                <Suspense fallback={<RetroLoader />}>
                  <Routes>
                    <Route path="b/:code" element={<BobbyQR />} />
                    <Route path="parent/:code" element={<BobbyParent />} />
                    <Route path="bobby-cloud" element={<BobbyCloudAuth />} />
                    <Route path="reset-password" element={<ResetPassword />} />
                    <Route path="parent-test" element={<ParentTest />} />
                    <Route path="admin" element={<Admin />} />
                    <Route path="technologie" element={<Technologie />} />
                    <Route path="fonctionnalites" element={<Fonctionnalites />} />
                    <Route path="securite" element={<Securite />} />
                    <Route path="guide" element={<Guide />} />
                    <Route path="faq" element={<FAQ />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="mentions-legales" element={<MentionsLegales />} />
                    <Route path="store" element={<StorePage />} />
                    <Route path="precommande" element={<Precommande />} />
                    <Route path="face-test" element={<FaceTest />} />
                    <Route path="debug" element={<Debug />} />
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
