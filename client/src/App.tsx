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
            <Route path="/s/:shortCode">
              {({ shortCode }) => {
                // Handle short URL redirects client-side
                useEffect(() => {
                  // Fetch the event ID based on the short code
                  const fetchEventId = async () => {
                    try {
                      console.log("[Short URL] Fetching event for short code:", shortCode);
                      const response = await fetch(`/api/events/shortcode/${shortCode}`);
                      
                      if (response.ok) {
                        const event = await response.json();
                        console.log("[Short URL] Found event, redirecting to event ID:", event.id);
                        
                        // Redirect to the event page
                        navigate(`/event/${event.id}`, { replace: true });
                      } else {
                        console.error("[Short URL] Event not found for short code:", shortCode, "Status:", response.status);
                        // If not found, redirect to not found page
                        navigate("/not-found", { replace: true });
                      }
                    } catch (error) {
                      console.error("[Short URL] Error fetching event:", error);
                      navigate("/not-found", { replace: true });
                    }
                  };
                  
                  console.log("[Short URL] Processing short URL with code:", shortCode);
                  fetchEventId();
                }, [shortCode]);
                
                return <div className="flex items-center justify-center min-h-[50vh]">
                  <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--quran-green))]" />
                  <span className="ml-3">Redirecting...</span>
                </div>;
              }}
            </Route>
            <Route path="/not-found">
              {() => <NotFound />}
            </Route>
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
