import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-3 py-6' : 'px-4 py-10'} ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ledger-50 text-ledger-600 dark:bg-ledger-500/10 dark:text-ledger-400">
        <Icon size={21} strokeWidth={1.8} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-ink-900 dark:text-ink-50">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm leading-relaxed text-ink-300">{description}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-4 rounded-xl bg-ledger-500 px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-ledger-600">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
