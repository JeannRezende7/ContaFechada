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
      <div className="flex min-h-10 items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Cancelar e voltar"
          className="-ml-2 inline-flex min-h-10 shrink-0 items-center gap-1 rounded-pill px-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50 dark:text-ink-100 dark:hover:bg-ink-900"
        >
          <X size={18} /> Cancelar
        </button>
        {actionLabel && (
          <button
            type={actionType}
            onClick={onAction}
            disabled={actionDisabled}
            className="min-h-10 shrink-0 rounded-pill bg-ledger-500 px-4 text-sm font-semibold text-white hover:bg-ledger-600 disabled:cursor-wait disabled:opacity-50"
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
