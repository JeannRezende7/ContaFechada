import { CheckCircle2, CircleAlert } from 'lucide-react';

export default function FeedbackMessage({ message, error = false, className = '' }) {
  if (!message) return null;
  const Icon = error ? CircleAlert : CheckCircle2;
  return (
    <p role={error ? 'alert' : 'status'} aria-live="polite" className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${error ? 'bg-signal-50 text-signal-500 dark:bg-signal-500/10' : 'bg-ledger-50 text-ledger-600 dark:bg-ledger-500/10 dark:text-ledger-400'} ${className}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
