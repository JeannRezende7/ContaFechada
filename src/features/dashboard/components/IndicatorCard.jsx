import { formatCurrency } from '../../../utils/formatCurrency.js';

const TONES = {
  neutral: { text: 'text-ink-900', badge: 'bg-ink-50 text-ink-500' },
  positive: { text: 'text-ledger-600', badge: 'bg-ledger-50 text-ledger-600' },
  negative: { text: 'text-signal-500', badge: 'bg-signal-50 text-signal-500' },
  pending: { text: 'text-pending-500', badge: 'bg-clay-50 text-clay-500' },
};

/** One of the top-of-dashboard indicator cards (Saldo, A pagar, A receber). */
export default function IndicatorCard({ label, value, tone = 'neutral', hint, icon: Icon }) {
  const t = TONES[tone];
  return (
    <div className="bg-white rounded-card shadow-card hover:shadow-card-hover transition-shadow p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-300 font-medium">{label}</span>
        {Icon && (
          <span className={`w-7 h-7 rounded-full flex items-center justify-center ${t.badge}`}>
            <Icon size={14} strokeWidth={2} />
          </span>
        )}
      </div>
      <span className={`money text-xl font-semibold ${t.text}`}>{formatCurrency(value)}</span>
      {hint && <span className="text-xs text-ink-300">{hint}</span>}
    </div>
  );
}
