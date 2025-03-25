import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        {/* Show auth modal with the current path as returnTo parameter */}
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-medium mb-4">Authentication Required</h2>
            <p className="mb-4">You need to sign in to access this page</p>
            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Sign In
            </button>
          </div>
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
