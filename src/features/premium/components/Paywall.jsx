import { Crown, Sparkles, X } from 'lucide-react';
import { FEATURES, PRICING } from '../../../config/premium.js';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import PlanComparisonTable from './PlanComparisonTable.jsx';

const FEATURE_COPY = {
  [FEATURES.RELATORIOS_AVANCADOS]: ['Relatórios avançados', 'Compare meses e acompanhe sua evolução financeira.'],
  [FEATURES.INSIGHTS_AVANCADOS]: ['Insights financeiros', 'Receba projeções e sugestões mais completas.'],
  [FEATURES.IMPORTACAO_EXTRATO]: ['Importação assistida', 'Importe por print, CSV ou OFX e revise antes de salvar.'],
  [FEATURES.REGRAS_CATEGORIZACAO]: ['Categorização automática', 'Crie regras para organizar seus lançamentos.'],
  [FEATURES.ACOES_EM_MASSA]: ['Ações em massa', 'Edite ou exclua vários lançamentos de uma vez.'],
  [FEATURES.BUSCA_GLOBAL]: ['Busca global', 'Pesquise em todo o histórico com filtros avançados.'],
};

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Paywall({ context, onClose }) {
  const confirm = useConfirm();
  const [title, description] = FEATURE_COPY[context?.feature] ?? [
    'Conta Fechada Pro',
    'Desbloqueie todas as funções locais e remova os anúncios para sempre.',
  ];

  async function handlePurchase() {
    await confirm('A compra do Pro ainda não está habilitada. Nenhum valor foi cobrado.');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-900/50 px-4 py-6" onClick={onClose}>
      <div className="relative my-auto w-full max-w-md rounded-card bg-white p-5 shadow-pop dark:bg-ink-700" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 text-ink-300 hover:text-ink-700 dark:hover:text-ink-50"><X size={18} /></button>
        <div className="mb-5 flex items-start gap-3 pr-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-700"><Sparkles size={19} /></span>
          <div><p className="font-semibold text-ink-900 dark:text-ink-50">{title}</p><p className="mt-1 text-sm text-ink-500">{description}</p></div>
        </div>
        <div className="mb-4 rounded-card bg-ink-50/60 p-3 dark:bg-ink-900/60"><PlanComparisonTable /></div>
        <div className="mb-4 text-center">
          <p className="text-xs text-ink-300">Pagamento único</p>
          <p className="mt-1 font-display text-3xl font-semibold text-ink-900 dark:text-ink-50">{formatBRL(PRICING.proLifetime)}</p>
          <p className="mt-1 text-xs text-ink-300">Acesso permanente às funções Pro neste e nos próximos aparelhos.</p>
        </div>
        <button type="button" onClick={handlePurchase} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ledger-500 py-2.5 text-sm font-semibold text-white hover:bg-ledger-600"><Crown size={16} /> Comprar Pro</button>
      </div>
    </div>
  );
}
