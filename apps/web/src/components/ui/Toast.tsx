import { useEffect } from 'react';
import { toast } from 'sonner';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, variant = 'info', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const toastFn = variant === 'success' ? toast.success : variant === 'error' ? toast.error : toast.info;
    toastFn(message, { duration });
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, variant, onClose, duration]);

  return null;
}
