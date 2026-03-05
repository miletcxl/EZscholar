import { useEffect } from 'react';
import clsx from 'clsx';
import { useUiStore } from '../stores/useUiStore';

export function ToastCenter() {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        dismissToast(toast.id);
      }, 2800),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
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
