import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { PERIOD_TYPES, shiftAnchor, formatPeriodLabel } from '../../utils/periodRange.js';

/**
 * Period-type switcher (Dia/Semana/Mês/Ano/Período) + prev/next navigator for
 * the anchor date — 'Período' swaps the arrows for a manual date range.
 */
export default function PeriodNav({ periodType, anchor, customRange, onChangePeriodType, onChangeAnchor, onChangeCustomRange }) {
  return (
    <div className="mb-4">
      <div className="flex gap-1 bg-ink-50 dark:bg-ink-900 rounded-pill p-1 mb-2">
        {PERIOD_TYPES.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChangePeriodType(opt.key)}
            className={`flex-1 rounded-pill py-1.5 text-xs font-medium transition-colors ${
              periodType === opt.key ? 'bg-white dark:bg-ink-700 shadow-card text-ink-900 dark:text-ink-50' : 'text-ink-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {periodType === 'periodo' ? (
        <div className="flex items-center gap-2 bg-white dark:bg-ink-700 rounded-card shadow-card px-3 py-2">
          <input
            type="date"
            value={customRange?.de ?? ''}
            onChange={(e) => onChangeCustomRange({ ...customRange, de: e.target.value })}
            className="flex-1 min-w-0 text-sm rounded-lg border border-ink-100 px-2 py-1.5"
          />
          <span className="text-ink-300 text-sm">–</span>
          <input
            type="date"
            value={customRange?.ate ?? ''}
            onChange={(e) => onChangeCustomRange({ ...customRange, ate: e.target.value })}
            className="flex-1 min-w-0 text-sm rounded-lg border border-ink-100 px-2 py-1.5"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white dark:bg-ink-700 rounded-card shadow-card px-2 py-2">
          <button
            type="button"
            onClick={() => onChangeAnchor(shiftAnchor(periodType, anchor, -1))}
            aria-label="Anterior"
            className="w-9 h-9 flex items-center justify-center rounded-pill text-ink-500 hover:bg-ink-50 active:scale-95 transition"
          >
            <ChevronLeft size={20} strokeWidth={1.75} />
          </button>
          <span className="flex items-center gap-2 font-display text-sm font-semibold text-ink-900 dark:text-ink-50 text-center">
            <Calendar size={16} className="text-ledger-500 shrink-0" strokeWidth={1.75} />
            {formatPeriodLabel(periodType, anchor, customRange)}
          </span>
          <button
            type="button"
            onClick={() => onChangeAnchor(shiftAnchor(periodType, anchor, 1))}
            aria-label="Próximo"
            className="w-9 h-9 flex items-center justify-center rounded-pill text-ink-500 hover:bg-ink-50 active:scale-95 transition"
          >
            <ChevronRight size={20} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}
