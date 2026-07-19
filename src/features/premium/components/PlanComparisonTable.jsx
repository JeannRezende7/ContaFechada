import { PLAN_COMPARISON } from '../../../config/premium.js';

/**
 * Side-by-side Gratuito vs Premium comparison, row per feature — single
 * source of truth is PLAN_COMPARISON so this and the paywall never drift
 * apart. `currentPlan` ('free' | 'premium'), when given, highlights the
 * column the viewer is actually on.
 */
export default function PlanComparisonTable({ currentPlan }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
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
              Premium
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
  );
}
