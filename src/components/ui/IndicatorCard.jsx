import { formatCurrency } from '../../utils/formatCurrency.js';

const TONES = {
  neutral: { text: 'text-ink-900 dark:text-ink-50', badge: 'bg-ink-50 dark:bg-ink-900 text-ink-500' },
  positive: { text: 'text-ledger-600', badge: 'bg-ledger-50 text-ledger-600' },
  negative: { text: 'text-signal-500', badge: 'bg-signal-50 text-signal-500' },
  pending: { text: 'text-pending-500', badge: 'bg-clay-50 text-clay-500' },
};

/** A small stat tile (label + money value + optional icon badge/hint) used across summary rows. */
export default function IndicatorCard({ label, value, tone = 'neutral', hint, icon: Icon }) {
  const t = TONES[tone];
  return (
    <div className="bg-white dark:bg-ink-700 rounded-card shadow-card hover:shadow-card-hover transition-shadow p-2 sm:p-4 md:p-5 flex flex-col gap-1 sm:gap-2 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] sm:text-xs md:text-sm text-ink-300 font-medium truncate">{label}</span>
        {Icon && (
          <span className={`w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 ${t.badge}`}>
            <Icon size={11} strokeWidth={2} className="sm:hidden" />
            <Icon size={14} strokeWidth={2} className="hidden sm:block md:w-4 md:h-4" />
          </span>
        )}
      </div>
      <span className={`money text-xs sm:text-xl md:text-2xl font-semibold leading-tight break-all ${t.text}`}>
        {formatCurrency(value)}
      </span>
      {hint && <span className="text-[11px] sm:text-xs md:text-sm text-ink-300 truncate">{hint}</span>}
    </div>
  );
}
