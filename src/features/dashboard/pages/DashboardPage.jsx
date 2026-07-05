import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowDownCircle, ArrowUpCircle, PieChart, ChevronRight, Home, PiggyBank } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { getDashboardIndicators } from '../services/dashboardService.js';
import IndicatorCard from '../../../components/ui/IndicatorCard.jsx';
import MonthNav from '../../../components/ui/MonthNav.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import { getCurrentMonthKey, daysRemainingInMonth } from '../../../utils/monthKey.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [indicators, setIndicators] = useState(null);

  useEffect(() => {
    if (!uid) return;
    getDashboardIndicators(uid, monthKey).then(setIndicators);
  }, [uid, monthKey]);

  const diasRestantes = daysRemainingInMonth(monthKey);
  const gastoDiario = indicators && diasRestantes > 0 ? indicators.saldoMes / diasRestantes : null;

  return (
    <>
      <Topbar title="Início" icon={Home} />
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <MonthNav monthKey={monthKey} onChange={setMonthKey} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <IndicatorCard
            label="Saldo do mês"
            value={indicators?.saldoMes ?? 0}
            tone={indicators && indicators.saldoMes < 0 ? 'negative' : 'positive'}
            icon={Wallet}
          />
          <IndicatorCard
            label="A pagar (mês)"
            value={indicators?.totalAPagar ?? 0}
            tone="pending"
            icon={ArrowDownCircle}
            hint={indicators?.contasAtrasadas ? `${indicators.contasAtrasadas} atrasada(s)` : undefined}
          />
          <IndicatorCard
            label="A receber (mês)"
            value={indicators?.totalAReceber ?? 0}
            tone="positive"
            icon={ArrowUpCircle}
          />
        </div>

        {gastoDiario != null && (
          <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center gap-3">
            <span
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                gastoDiario > 0 ? 'bg-ledger-500 text-white' : 'bg-signal-500 text-white'
              }`}
            >
              <PiggyBank size={18} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-ink-300">
                Gasto diário recomendado · {diasRestantes} dia{diasRestantes === 1 ? '' : 's'} restante{diasRestantes === 1 ? '' : 's'}
              </p>
              {gastoDiario > 0 ? (
                <p className="money text-lg font-semibold text-ledger-600">{formatCurrency(gastoDiario)}/dia</p>
              ) : (
                <p className="text-sm font-medium text-signal-500">
                  Saldo do mês já negativo — evite novos gastos até equilibrar.
                </p>
              )}
            </div>
          </div>
        )}

        <Link
          to="/relatorios"
          className="mt-4 flex items-center gap-2.5 text-ink-500 text-sm bg-white dark:bg-ink-700 rounded-card shadow-card hover:shadow-card-hover p-4 transition-shadow"
        >
          <span className="w-8 h-8 rounded-full bg-clay-50 text-clay-500 flex items-center justify-center shrink-0">
            <PieChart size={16} strokeWidth={1.75} />
          </span>
          <span className="flex-1">Veja a distribuição de gastos por categoria e a evolução mês a mês</span>
          <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-ink-300" />
        </Link>
      </div>
    </>
  );
}
