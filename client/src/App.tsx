import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { Suspense, lazy, useEffect } from "react";
import { ProtectedRoute } from "./lib/protected-route";
import Header from "./components/Header";
import MobileNavigation from "./components/MobileNavigation";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./hooks/use-auth";
import { useAuthModal, AuthModalProvider } from "./hooks/use-auth-modal";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting
const HomePage = lazy(() => import("@/pages/home-page"));
const EventPage = lazy(() => import("@/pages/event-page"));
const CirclesPage = lazy(() => import("@/pages/circles-page"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const NotFound = lazy(() => import("@/pages/not-found"));

function AppContent() {
  const { user } = useAuth();
  const { isOpen, initialAction, closeAuthModal, openAuthModal } = useAuthModal();
  const [location, navigate] = useLocation();
  
  // Redirect from /forgot-password to the modal
  useEffect(() => {
    if (location === "/forgot-password") {
      openAuthModal("forgot-password");
      navigate("/", { replace: true });
    }
  }, [location, navigate, openAuthModal]);
  
  return (
    <div className="min-h-screen flex flex-col bg-neutral-100">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--quran-green))]" />
          </div>
        }>
          <Switch>
            <Route path="/">
              {() => <HomePage />}
            </Route>
            <Route path="/event/:id">
              {() => <EventPage />}
            </Route>
            <Route path="/reset-password">
              {() => <ResetPasswordPage />}
            </Route>
            <ProtectedRoute path="/circles" component={() => <CirclesPage />} />
            <Route>
              {() => <NotFound />}
            </Route>
          </Switch>
        </Suspense>
      </main>
      <MobileNavigation />
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={isOpen} 
        onClose={closeAuthModal} 
        action={initialAction}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthModalProvider>
          <AppContent />
          <Toaster />
        </AuthModalProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
