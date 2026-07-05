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
            className={`flex-1 rounded-pill py-1.5 md:py-2 text-xs md:text-sm font-medium transition-colors ${
              periodType === opt.key ? 'bg-white dark:bg-ink-700 shadow-card text-ink-900 dark:text-ink-50' : 'text-ink-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {periodType === 'periodo' ? (
        <div className="flex items-center gap-2 bg-white dark:bg-ink-700 rounded-card shadow-card px-3 py-2 md:py-3">
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] text-ink-300 mb-0.5">De</label>
            <input
              type="date"
              value={customRange?.de ?? ''}
              onChange={(e) => onChangeCustomRange({ ...customRange, de: e.target.value })}
              className="[color-scheme:light] w-full min-w-0 text-sm md:text-base bg-white text-ink-900 rounded-lg border border-ink-100 px-2 py-1.5"
            />
          </div>
          <span className="text-ink-300 text-sm mt-4">–</span>
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] text-ink-300 mb-0.5">Até</label>
            <input
              type="date"
              value={customRange?.ate ?? ''}
              onChange={(e) => onChangeCustomRange({ ...customRange, ate: e.target.value })}
              className="[color-scheme:light] w-full min-w-0 text-sm md:text-base bg-white text-ink-900 rounded-lg border border-ink-100 px-2 py-1.5"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white dark:bg-ink-700 rounded-card shadow-card px-2 py-2 md:py-3">
          <button
            type="button"
            onClick={() => onChangeAnchor(shiftAnchor(periodType, anchor, -1))}
            aria-label="Anterior"
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-pill text-ink-500 hover:bg-ink-50 active:scale-95 transition"
          >
            <ChevronLeft size={20} strokeWidth={1.75} className="md:w-6 md:h-6" />
          </button>
          <span className="flex items-center gap-2 font-display text-sm md:text-base font-semibold text-ink-900 dark:text-ink-50 text-center">
            <Calendar size={16} className="text-ledger-500 shrink-0 md:w-[18px] md:h-[18px]" strokeWidth={1.75} />
            {formatPeriodLabel(periodType, anchor, customRange)}
          </span>
          <button
            type="button"
            onClick={() => onChangeAnchor(shiftAnchor(periodType, anchor, 1))}
            aria-label="Próximo"
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-pill text-ink-500 hover:bg-ink-50 active:scale-95 transition"
          >
            <ChevronRight size={20} strokeWidth={1.75} className="md:w-6 md:h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
