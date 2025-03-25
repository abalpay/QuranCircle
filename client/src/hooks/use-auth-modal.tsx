import React, { createContext, useState, useContext, ReactNode } from 'react';

type AuthModalContextType = {
  isOpen: boolean;
  initialAction: 'login' | 'register';
  openAuthModal: (action?: 'login' | 'register') => void;
  closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialAction, setInitialAction] = useState<'login' | 'register'>('login');

  const openAuthModal = (action: 'login' | 'register' = 'login') => {
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
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}