import { ArrowLeft } from 'lucide-react';

/** Consistent, reachable close action for Android bottom sheets. */
export default function ModalHeader({ title, onBack, className = '' }) {
  return (
    <div className={`mb-4 flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onBack}
        aria-label="Voltar"
        className="-ml-2 inline-flex min-h-10 shrink-0 items-center gap-1 rounded-pill px-2.5 text-sm font-medium text-ledger-600 hover:bg-ledger-50 dark:hover:bg-ink-900"
      >
        <ArrowLeft size={19} />
        <span className="sm:hidden">Voltar</span>
      </button>
      <h2 className="min-w-0 flex-1 font-display text-base font-semibold text-ink-900 dark:text-ink-50">
        {title}
      </h2>
    </div>
  );
}
