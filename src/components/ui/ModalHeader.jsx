import { X } from 'lucide-react';

/** Consistent, reachable close action for Android bottom sheets. */
export default function ModalHeader({
  title,
  onBack,
  actionLabel,
  onAction,
  actionType = 'button',
  actionDisabled = false,
  className = '',
}) {
  return (
    <header className={`mb-4 ${className}`}>
      <div className={`grid gap-3 ${actionLabel ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Cancelar e voltar"
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-ink-100 bg-ink-50 px-4 text-sm font-semibold text-ink-500 hover:bg-ink-100 dark:border-ink-900 dark:bg-ink-900 dark:text-ink-100"
        >
          <X size={18} /> Cancelar
        </button>
        {actionLabel && (
          <button
            type={actionType}
            onClick={onAction}
            disabled={actionDisabled}
            className="min-h-12 rounded-xl bg-ledger-500 px-4 text-sm font-semibold text-white shadow-card hover:bg-ledger-600 disabled:cursor-wait disabled:opacity-50"
          >
            {actionLabel}
          </button>
        )}
      </div>
      <h2 className="mt-2 font-display text-lg font-semibold text-ink-900 dark:text-ink-50">
        {title}
      </h2>
    </header>
  );
}
