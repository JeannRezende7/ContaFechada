import { useEffect, useState } from 'react';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { getDashboardIndicators } from '../services/dashboardService.js';
import IndicatorCard from '../components/IndicatorCard.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';

export default function DashboardPage() {
  const { slug } = useTenant();
  const [indicators, setIndicators] = useState(null);

  useEffect(() => {
    if (!slug) return;
    getDashboardIndicators(slug).then(setIndicators);
  }, [slug]);

  return (
    <>
      <Topbar title="Início" />
      <div className="p-4 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <IndicatorCard
            label="Saldo atual"
            value={indicators?.saldoAtual ?? 0}
            tone={indicators && indicators.saldoAtual < 0 ? 'negative' : 'positive'}
          />
          <IndicatorCard
            label="A pagar (mês)"
            value={indicators?.totalAPagar ?? 0}
            tone="pending"
            hint={indicators?.contasAtrasadas ? `${indicators.contasAtrasadas} atrasada(s)` : undefined}
          />
          <IndicatorCard label="A receber (mês)" value={indicators?.totalAReceber ?? 0} tone="positive" />
        </div>

        <div className="mt-8 text-ink-300 text-sm">
          Gráficos de projeção de fluxo de caixa e distribuição de gastos entram na próxima fase do MVP.
        </div>
      </div>
    </>
  );
}
