import { ToastComponent, type Toast } from './toast';

interface ToasterProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const Toaster = ({ toasts, onDismiss }: ToasterProps) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map(toast => (
        <ToastComponent key={toast.id} toast={toast} onClose={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

