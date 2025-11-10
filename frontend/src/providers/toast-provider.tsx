import type { PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';
import { useToast } from '@/hooks/useToast';
import { Toaster } from '@/components/ui/toaster';

interface ToastContextValue {
  toast: (toastData: { title?: string; description: string; variant?: 'default' | 'destructive' }) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const { toasts, toast, dismiss } = useToast();

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

