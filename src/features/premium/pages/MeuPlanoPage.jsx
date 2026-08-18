import { Crown, ShieldCheck } from 'lucide-react';
import Topbar from '../../../components/layout/Topbar.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { PRICING } from '../../../config/premium.js';
import PlanComparisonTable from '../components/PlanComparisonTable.jsx';

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MeuPlanoPage() {
  const { hasProAccess, openPaywall } = usePremium();

  return (
    <>
      <Topbar title="Meu Plano" icon={Crown} />
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-8">
        <div className="rounded-card bg-white p-5 shadow-card dark:bg-ink-700">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">{hasProAccess ? 'Conta Fechada Pro' : 'Plano Gratuito'}</p>
            {hasProAccess && <span className="flex items-center gap-1 rounded-pill bg-gold-50 px-2.5 py-1 text-xs font-semibold text-gold-700"><Crown size={12} /> Pro</span>}
          </div>
          <p className="mb-4 text-sm text-ink-500">{hasProAccess ? 'Funções Pro desbloqueadas permanentemente e anúncios removidos.' : 'Use os recursos essenciais gratuitamente com anúncios.'}</p>
          {!hasProAccess && <button type="button" onClick={() => openPaywall()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ledger-500 py-2.5 text-sm font-medium text-white hover:bg-ledger-600"><Crown size={16} /> Desbloquear Pro por {formatBRL(PRICING.proLifetime)}</button>}
        </div>

        <div className="rounded-card bg-white p-5 shadow-card dark:bg-ink-700">
          <div className="mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-ledger-500" /><p className="text-sm font-medium">O que o Pro desbloqueia</p></div>
          <PlanComparisonTable />
          {!hasProAccess && <button type="button" onClick={() => openPaywall()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ledger-500 py-2.5 text-sm font-medium text-white hover:bg-ledger-600"><Crown size={16} /> Comprar Pro</button>}
        </div>

        <p className="text-center text-[11px] leading-relaxed text-ink-300">O Pro é uma compra única e não possui renovação mensal.</p>
      </div>
    </>
  );
}
