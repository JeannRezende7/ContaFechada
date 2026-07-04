import { formatCurrency } from '../../../utils/formatCurrency.js';

const TONES = {
  neutral: 'text-ink-900',
  positive: 'text-ledger-600',
  negative: 'text-signal-500',
  pending: 'text-pending-500',
};

/** One of the top-of-dashboard indicator cards (Saldo, A pagar, A receber). */
export default function IndicatorCard({ label, value, tone = 'neutral', hint }) {
  return (
    <div className="bg-white rounded-card shadow-card p-4 flex flex-col gap-1">
      <span className="text-xs text-ink-300 font-medium">{label}</span>
      <span className={`money text-xl font-semibold ${TONES[tone]}`}>{formatCurrency(value)}</span>
      {hint && <span className="text-xs text-ink-300">{hint}</span>}
    </div>
  );
}
