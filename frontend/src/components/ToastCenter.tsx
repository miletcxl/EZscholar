import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useUiStore } from '../stores/useUiStore';

export function ToastCenter() {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);
  // Track which toast IDs already have timers so we don't reset them
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    toasts.forEach((toast) => {
      if (!timerMap.current.has(toast.id)) {
        const handle = window.setTimeout(() => {
          dismissToast(toast.id);
          timerMap.current.delete(toast.id);
        }, 8000);
        timerMap.current.set(toast.id, handle);
      }
    });

    // Clean up timers for toasts that were manually dismissed
    timerMap.current.forEach((handle, id) => {
      if (!toasts.find((t) => t.id === id)) {
        clearTimeout(handle);
        timerMap.current.delete(id);
      }
    });
  }, [dismissToast, toasts]);

  return (
    <div className="toast-center" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article key={toast.id} className={clsx('toast-item', `toast-${toast.tone}`)}>
          <p>{toast.title}</p>
          <button
            aria-label="关闭提示"
            type="button"
            className="toast-close"
            onClick={() => dismissToast(toast.id)}
          >
            ×
          </button>
        </article>
      ))}
    </div>
  );
}

