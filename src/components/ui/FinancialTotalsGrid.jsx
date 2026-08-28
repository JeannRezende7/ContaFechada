import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import IndicatorCard from './IndicatorCard.jsx';

export default function FinancialTotalsGrid({
  incomeLabel,
  incomeValue,
  expenseLabel,
  expenseValue,
  balanceLabel,
  balanceValue,
  expenseTone = 'negative',
  balanceTone,
  incomeHint,
  expenseHint,
  className = '',
}) {
  return (
    <div className={`grid grid-cols-2 gap-2 md:gap-3 ${className}`}>
      <IndicatorCard label={incomeLabel} value={incomeValue} tone="positive" icon={ArrowUpCircle} hint={incomeHint} />
      <IndicatorCard label={expenseLabel} value={expenseValue} tone={expenseTone} icon={ArrowDownCircle} hint={expenseHint} />
      <div className="col-span-2 mx-auto w-[68%] min-w-0 sm:w-[48%]">
        <IndicatorCard
          label={balanceLabel}
          value={balanceValue}
          tone={balanceTone ?? (balanceValue < 0 ? 'negative' : 'positive')}
          icon={Wallet}
        />
      </div>
    </div>
  );
}
