import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import EventPage from "@/pages/event-page";
import CirclesPage from "@/pages/circles-page";
import { ProtectedRoute } from "./lib/protected-route";
import Header from "./components/Header";
import MobileNavigation from "./components/MobileNavigation";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./hooks/use-auth";
import { useAuthModal, AuthModalProvider } from "./hooks/use-auth-modal";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";

function AppContent() {
  const { user } = useAuth();
  const { isOpen, initialAction, closeAuthModal } = useAuthModal();
  
  return (
    <div className="min-h-screen flex flex-col bg-neutral-100">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/event/:id" component={EventPage} />
          <ProtectedRoute path="/circles" component={CirclesPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {!user && <MobileNavigation />}
      
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
