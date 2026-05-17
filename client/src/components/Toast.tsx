import { useEffect } from 'react';

export interface ToastState {
  readonly id: number;
  readonly kind: 'success' | 'error';
  readonly message: string;
}

interface ToastProps {
  readonly toast: ToastState | null;
  readonly onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, toast.kind === 'error' ? 5000 : 2500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const bg = toast.kind === 'success' ? 'bg-stone-900 text-stone-50' : 'bg-rose-700 text-rose-50';
  return (
    <div
      role="status"
      className={`fixed z-50 left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 px-4 py-2.5 rounded-lg shadow-lg text-[13px] font-medium ${bg}`}
    >
      {toast.message}
    </div>
  );
}
