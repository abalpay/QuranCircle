"use client";

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
} from "react";
import AuthModal from "@/components/auth-modal";

type AuthAction = "login" | "register" | "forgot-password";

type AuthModalContextType = {
  isOpen: boolean;
  initialAction: AuthAction;
  openAuthModal: (action?: AuthAction) => void;
  closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialAction, setInitialAction] = useState<AuthAction>("login");

  const openAuthModal = (action: AuthAction = "login") => {
    setInitialAction(action);
    setIsOpen(true);
  };

  const closeAuthModal = () => {
    setIsOpen(false);
  };

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        initialAction,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
      <AuthModal
        isOpen={isOpen}
        onClose={closeAuthModal}
        action={initialAction}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}
