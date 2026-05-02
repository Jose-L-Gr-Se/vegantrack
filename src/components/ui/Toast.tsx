import { X, Check, AlertCircle, Info } from 'lucide-react';
import { useToastStore } from '@/stores/toastStore';
import type { ToastType } from '@/stores/toastStore';

const CONFIG: Record<ToastType, { bg: string; Icon: React.ElementType }> = {
  success: { bg: 'bg-brand-600',    Icon: Check },
  error:   { bg: 'bg-red-500',      Icon: AlertCircle },
  info:    { bg: 'bg-surface-800',  Icon: Info },
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
    >
      {toasts.map((t) => {
        const { bg, Icon } = CONFIG[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg max-w-sm w-full ${bg} text-white`}
            style={{ animation: 'toast-in 0.26s cubic-bezier(0.16,1,0.3,1) both' }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar"
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
