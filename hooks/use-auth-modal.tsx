"use client";

import React, {
  createContext,
  useState,
  useContext,
  useRef,
  ReactNode,
} from "react";
import AuthModal from "@/components/auth-modal";

type AuthAction = "login" | "register" | "forgot-password";

type AuthModalContextType = {
  isOpen: boolean;
  initialAction: AuthAction;
  openAuthModal: (action?: AuthAction, onSuccess?: () => void) => void;
  closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialAction, setInitialAction] = useState<AuthAction>("login");
  const onSuccessRef = useRef<(() => void) | undefined>(undefined);

  const openAuthModal = (action: AuthAction = "login", onSuccess?: () => void) => {
    onSuccessRef.current = onSuccess;
    setInitialAction(action);
    setIsOpen(true);
  };

  const closeAuthModal = () => {
    onSuccessRef.current = undefined;
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
        onSuccess={() => {
          const cb = onSuccessRef.current;
          onSuccessRef.current = undefined;
          cb?.();
        }}
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
