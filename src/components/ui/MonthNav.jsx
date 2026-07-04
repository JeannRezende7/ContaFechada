import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatMonthLabel, shiftMonthKey } from '../../utils/monthKey.js';

/** Prev/next month switcher — the "flip the spreadsheet page" control. */
export default function MonthNav({ monthKey, onChange }) {
  return (
    <div className="flex items-center justify-between bg-white rounded-card shadow-card px-2 py-2 mb-4">
      <button
        type="button"
        onClick={() => onChange(shiftMonthKey(monthKey, -1))}
        aria-label="Mês anterior"
        className="w-9 h-9 flex items-center justify-center rounded-pill text-ink-500 hover:bg-ink-50 active:scale-95 transition"
      >
        <ChevronLeft size={20} strokeWidth={1.75} />
      </button>
      <span className="flex items-center gap-2 font-display text-sm font-semibold text-ink-900">
        <Calendar size={16} className="text-ledger-500" strokeWidth={1.75} />
        {formatMonthLabel(monthKey)}
      </span>
      <button
        type="button"
        onClick={() => onChange(shiftMonthKey(monthKey, 1))}
        aria-label="Próximo mês"
        className="w-9 h-9 flex items-center justify-center rounded-pill text-ink-500 hover:bg-ink-50 active:scale-95 transition"
      >
        <ChevronRight size={20} strokeWidth={1.75} />
      </button>
    </div>
  );
}
