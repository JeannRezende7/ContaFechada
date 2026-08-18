import { Check } from 'lucide-react';
import { PLAN_COMPARISON } from '../../../config/premium.js';

/** Lista apenas os diferenciais pagos; recursos iguais nos dois planos não entram aqui. */
export default function PlanComparisonTable() {
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {PLAN_COMPARISON.map((item) => (
        <li key={item.label} className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ledger-50 text-ledger-600 dark:bg-ledger-500/10">
            <Check size={13} strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900 dark:text-ink-50">{item.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-300">{item.premium}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
