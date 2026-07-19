import { useEffect, useState } from 'react';
import { X, Sparkles, Crown, Gift } from 'lucide-react';
import { FEATURES, PRICING } from '../../../config/premium.js';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { hasAnyLancamento } from '../../lancamentos/services/lancamentosService.js';
import { createCheckout } from '../services/checkoutService.js';
import { track, EVENTS } from '../../../utils/analytics.js';
import PlanComparisonTable from './PlanComparisonTable.jsx';

/**
 * Contextual title/description per gated feature — the paywall adapts its
 * headline to whatever triggered it instead of a generic "assine Premium"
 * (Fase 5: "Adaptar titulo e texto ao recurso que causou o bloqueio").
 */
const FEATURE_COPY = {
  [FEATURES.CATEGORIAS_CUSTOM]: {
    title: 'Categorias personalizadas ilimitadas',
    desc: 'O plano Gratuito permite até 5 categorias personalizadas.',
  },
  [FEATURES.RECORRENCIAS]: {
    title: 'Recorrências ilimitadas',
    desc: 'O plano Gratuito permite até 2 recorrências ativas ao mesmo tempo.',
  },
  [FEATURES.METAS]: {
    title: 'Metas ilimitadas',
    desc: 'O plano Gratuito permite até 2 metas ativas ao mesmo tempo.',
  },
  [FEATURES.HISTORICO]: {
    title: 'Histórico completo',
    desc: 'O plano Gratuito mostra o mês atual e os 2 meses anteriores.',
  },
  [FEATURES.RELATORIOS_AVANCADOS]: {
    title: 'Relatórios avançados',
    desc: 'Compare meses e acompanhe a evolução com filtros avançados.',
  },
  [FEATURES.GESTOR_AVANCADO]: {
    title: 'Gestor Financeiro completo',
    desc: 'Projeções, comparações e análises históricas fazem parte do Premium.',
  },
  [FEATURES.INSIGHTS_AVANCADOS]: {
    title: 'Insights financeiros avançados',
    desc: 'Sugestões mais completas sobre sua saúde financeira.',
  },
  [FEATURES.EXPORTACAO_AVANCADA]: {
    title: 'Exportação avançada',
    desc: 'Exporte outros períodos e use filtros avançados.',
  },
};

const DISCOVERY_COPY = {
  title: 'Conheça o Conta Fechada Premium',
  desc: 'Desbloqueie os recursos avançados e use o mesmo plano no Web e no Android.',
};

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Full paywall (Fase 5). O botão "Assinar" chama netlify/functions/create-checkout.js
 * e redireciona pro checkout real do MercadoPago (Fase 8) — mas nunca
 * concede Premium no cliente: só o webhook (server-side, depois de
 * confirmar com o MercadoPago) escreve isso no Firestore. Se a função ainda
 * não estiver configurada (sem MERCADOPAGO_ACCESS_TOKEN no Netlify, por
 * exemplo — o caso hoje, sem conta real), cai de volta pro aviso de
 * "pagamentos em preparação" em vez de quebrar.
 */
export default function Paywall({ open, context, onClose }) {
  const { user } = useAuth();
  const { subscription, startTrial } = usePremium();
  const confirm = useConfirm();
  const [selected, setSelected] = useState('anual');
  const [purchaseState, setPurchaseState] = useState('idle'); // 'idle' | 'starting' | 'coming_soon'
  const [trialState, setTrialState] = useState('idle'); // 'idle' | 'starting' | 'error'
  const [jaTemLancamento, setJaTemLancamento] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected('anual');
      setPurchaseState('idle');
      setTrialState('idle');
    }
  }, [open]);

  // Fase 7: "iniciar depois do primeiro lançamento" — só oferece o teste
  // depois que a pessoa já usou o app de verdade uma vez, não no primeiro
  // segundo de conta criada.
  useEffect(() => {
    if (!open || !user?.uid || subscription.status !== 'none') return;
    let cancelled = false;
    hasAnyLancamento(user.uid).then((tem) => {
      if (!cancelled) setJaTemLancamento(tem);
    });
    return () => {
      cancelled = true;
    };
  }, [open, user?.uid, subscription.status]);

  if (!open) return null;

  // Elegível pro teste só quem nunca começou um (Fase 7: "apenas um teste por
  // uid") — subscription.status só é 'none' antes do primeiro uso; depois
  // vira 'trialing' pra sempre (o Firestore Rule impede reverter isso) — e só
  // depois do primeiro lançamento criado.
  const elegivelParaTeste = subscription.status === 'none' && jaTemLancamento;

  async function handleStartTrial() {
    const confirmado = await confirm(
      `Iniciar teste grátis de ${PRICING.trialDias} dias do Premium? Não pede cartão de crédito. ` +
        'Ao final do período você volta automaticamente pro plano Gratuito — nada é cobrado e nenhum dado é apagado.'
    );
    if (!confirmado) return;
    setTrialState('starting');
    try {
      await startTrial();
      onClose();
    } catch {
      setTrialState('error');
    }
  }

  async function handleAssinar() {
    setPurchaseState('starting');
    try {
      const { checkoutUrl } = await createCheckout(selected);
      track(EVENTS.CHECKOUT_STARTED, { plan: selected });
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Checkout indisponível:', err.message);
      setPurchaseState('coming_soon');
    }
  }

  const featureCopy = (context?.feature && FEATURE_COPY[context.feature]) || DISCOVERY_COPY;
  const limitNote =
    context?.reason === 'limit_reached' && context?.limit != null
      ? ` Você atingiu o limite de ${context.limit} do plano Gratuito.`
      : '';

  const anualPorMes = PRICING.anual / 12;

  return (
    <div
      className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 px-4 py-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-ink-700 w-full max-w-md rounded-card shadow-pop p-5 md:p-6 relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-ink-300 hover:text-ink-700 dark:hover:text-ink-50 transition-colors"
        >
          <X size={18} strokeWidth={2} />
        </button>

        <div className="flex items-start gap-3 mb-5 pr-6">
          <span className="w-10 h-10 rounded-full bg-gold-50 text-gold-700 flex items-center justify-center shrink-0">
            <Sparkles size={19} strokeWidth={2} />
          </span>
          <div className="pt-1">
            <p className="text-base font-semibold text-ink-900 dark:text-ink-50 mb-0.5">{featureCopy.title}</p>
            <p className="text-sm text-ink-500">
              {featureCopy.desc}
              {limitNote}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-ink-50/60 dark:bg-ink-900/60 p-3 mb-5">
          <PlanComparisonTable currentPlan="free" />
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <button
            type="button"
            onClick={() => setSelected('mensal')}
            className={`rounded-xl border-2 p-3 text-left transition-colors ${
              selected === 'mensal'
                ? 'border-ledger-500 bg-ledger-50/50 dark:bg-ledger-500/10'
                : 'border-ink-100 dark:border-ink-900'
            }`}
          >
            <p className="text-xs text-ink-300 mb-1">Mensal</p>
            <p className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">
              {formatBRL(PRICING.mensal)}
            </p>
            <p className="text-[11px] text-ink-300">por mês</p>
          </button>

          <button
            type="button"
            onClick={() => setSelected('anual')}
            className={`relative rounded-xl border-2 p-3 text-left transition-colors ${
              selected === 'anual'
                ? 'border-ledger-500 bg-ledger-50/50 dark:bg-ledger-500/10'
                : 'border-ink-100 dark:border-ink-900'
            }`}
          >
            <span className="absolute -top-2.5 right-3 rounded-pill bg-ledger-500 text-white text-[10px] font-semibold px-2 py-0.5">
              Recomendado
            </span>
            <p className="text-xs text-ink-300 mb-1">Anual</p>
            <p className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">
              {formatBRL(PRICING.anual)}
            </p>
            <p className="text-[11px] text-ink-300">equivale a {formatBRL(anualPorMes)}/mês</p>
          </button>
        </div>

        <p className="text-[11px] text-ink-300 text-center mb-4">
          Oferta de fundador: {formatBRL(PRICING.fundadorAnualPrimeiroAno)} no primeiro ano do plano anual.
          Teste grátis de {PRICING.trialDias} dias, sem cartão de crédito.
        </p>

        {elegivelParaTeste && (
          <button
            onClick={handleStartTrial}
            disabled={trialState === 'starting'}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-ledger-500 text-ledger-600 py-2.5 text-sm font-semibold hover:bg-ledger-50/50 dark:hover:bg-ledger-500/10 transition-colors mb-2 disabled:opacity-50"
          >
            <Gift size={16} strokeWidth={2.25} />
            {trialState === 'starting' ? 'Iniciando...' : `Testar grátis por ${PRICING.trialDias} dias`}
          </button>
        )}
        {trialState === 'error' && (
          <p className="text-xs text-signal-500 text-center mb-2">
            Não foi possível iniciar o teste agora. Tente de novo em instantes.
          </p>
        )}

        {purchaseState === 'coming_soon' ? (
          <div className="rounded-xl bg-ink-50 dark:bg-ink-900 px-4 py-3 text-center mb-2">
            <p className="text-sm text-ink-500">
              Os pagamentos ainda não estão disponíveis — o Premium está em preparação. Nada foi cobrado ou ativado.
            </p>
          </div>
        ) : (
          <button
            onClick={handleAssinar}
            disabled={purchaseState === 'starting'}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-ledger-500 text-white py-3 text-sm font-semibold hover:bg-ledger-600 hover:shadow-card-hover transition-all mb-2 disabled:opacity-50"
          >
            <Crown size={16} strokeWidth={2.25} />
            {purchaseState === 'starting'
              ? 'Abrindo checkout...'
              : `Assinar ${selected === 'anual' ? 'plano anual' : 'plano mensal'}`}
          </button>
        )}

        <button onClick={onClose} className="w-full text-center text-sm text-ink-300 hover:text-ink-500 py-1.5 transition-colors">
          Agora não
        </button>

        <p className="text-[10px] text-ink-300 text-center mt-3 leading-relaxed">
          A assinatura renova automaticamente até ser cancelada. Cancele quando quiser em Meu Plano; o acesso
          Premium continua até o fim do período já pago. Veja os{' '}
          <a href="/termos" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-500">
            Termos de Uso
          </a>{' '}
          e a{' '}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-500">
            Política de Privacidade
          </a>
          .
        </p>
      </div>
    </div>
  );
}
