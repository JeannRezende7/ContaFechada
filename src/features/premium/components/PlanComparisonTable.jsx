import { PLAN_COMPARISON } from '../../../config/premium.js';

/**
 * Side-by-side Gratuito vs Pro comparison, row per feature — single
 * source of truth is PLAN_COMPARISON so this and the paywall never drift
 * apart. `currentPlan` ('free' | 'premium'), when given, highlights the
 * column the viewer is actually on.
 */
export default function PlanComparisonTable({ currentPlan }) {
  return (
    <>
      <div className="divide-y divide-ink-100 dark:divide-ink-900 sm:hidden">
        {PLAN_COMPARISON.map((row) => (
          <div key={row.label} className="py-3 first:pt-0 last:pb-0">
            <p className="mb-2 text-sm font-medium text-ink-700 dark:text-ink-100">{row.label}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`min-w-0 rounded-card p-2 ${currentPlan === 'free' ? 'bg-ink-100 font-medium text-ink-900 dark:bg-ink-900 dark:text-ink-50' : 'bg-ink-50 text-ink-500 dark:bg-ink-900/50'}`}>
                <span className="mb-1 block text-[10px] font-normal text-ink-300">Gratuito</span>
                <span className="block break-words">{row.free}</span>
              </div>
              <div className={`min-w-0 rounded-card p-2 ${currentPlan === 'premium' ? 'bg-gold-50 font-medium text-gold-700' : 'bg-ledger-50 text-ledger-600 dark:bg-ledger-500/10'}`}>
                <span className="mb-1 block text-[10px] font-normal text-ink-300">Pro</span>
                <span className="block break-words">{row.premium}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left font-medium text-ink-300 text-xs pb-2 pl-1">Recurso</th>
            <th
              className={`text-center font-medium text-xs pb-2 px-2 ${
                currentPlan === 'free' ? 'text-ink-900 dark:text-ink-50' : 'text-ink-300'
              }`}
            >
              Gratuito
            </th>
            <th
              className={`text-center font-medium text-xs pb-2 pr-1 ${
                currentPlan === 'premium' ? 'text-gold-700' : 'text-ink-300'
              }`}
            >
              Pro
            </th>
          </tr>
        </thead>
        <tbody>
          {PLAN_COMPARISON.map((row) => (
            <tr key={row.label} className="border-t border-ink-100 dark:border-ink-900">
              <td className="py-2 pl-1 pr-2 text-ink-700 dark:text-ink-100">{row.label}</td>
              <td
                className={`py-2 px-2 text-center whitespace-nowrap ${
                  currentPlan === 'free' ? 'text-ink-900 dark:text-ink-50 font-medium' : 'text-ink-500'
                }`}
              >
                {row.free}
              </td>
              <td
                className={`py-2 pl-2 pr-1 text-center whitespace-nowrap ${
                  currentPlan === 'premium' ? 'text-gold-700 font-medium' : 'text-ledger-600'
                }`}
              >
                {row.premium}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
