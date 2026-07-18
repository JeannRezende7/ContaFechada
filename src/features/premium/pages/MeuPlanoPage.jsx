import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Crown, RefreshCw, Smartphone, ShieldCheck, XCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import { PLAN, PLAN_DETAILS } from '../../../config/premium.js';
import { cancelWebSubscription } from '../services/checkoutService.js';
import { track, EVENTS } from '../../../utils/analytics.js';
import Topbar from '../../../components/layout/Topbar.jsx';

const STATUS_LABEL = {
  none: 'Sem assinatura',
  trialing: 'Em teste grátis',
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
  expired: 'Expirada',
};

const PROVIDER_LABEL = {
  google_play: 'Google Play',
  web: 'Web',
  manual: 'Concessão manual',
};

const RETURN_POLL_ATTEMPTS = 5;
const RETURN_POLL_DELAY_MS = 2000;

export default function MeuPlanoPage() {
  const { subscription, isPremium, openPaywall, refreshSubscription } = usePremium();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [syncing, setSyncing] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [returnStatus, setReturnStatus] = useState(null); // null | 'checking' | 'confirmed' | 'pending'

  const isNative = Capacitor.isNativePlatform();
  const planLabel = PLAN_DETAILS[subscription.plan]?.label ?? PLAN_DETAILS[PLAN.FREE].label;

  // Volta do checkout do MercadoPago (netlify/functions/create-checkout.js
  // manda o usuário pra cá com ?checkout=retorno). O webhook processa a
  // notificação de forma assíncrona, então "voltou" não significa "já
  // confirmado" — a tela espera com um pequeno polling em vez de assumir
  // sucesso só pelo redirect (é exatamente o que "nunca liberar Premium
  // apenas pelo retorno do navegador" pede pra evitar).
  useEffect(() => {
    if (searchParams.get('checkout') !== 'retorno') return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('checkout');
      return next;
    });

    let cancelled = false;
    setReturnStatus('checking');

    (async () => {
      for (let attempt = 0; attempt < RETURN_POLL_ATTEMPTS; attempt++) {
        const state = await refreshSubscription();
        if (cancelled) return;
        if (state.isPremium) {
          setReturnStatus('confirmed');
          track(EVENTS.PURCHASE_COMPLETED);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, RETURN_POLL_DELAY_MS));
      }
      if (!cancelled) setReturnStatus('pending');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleRefresh() {
    setSyncing(true);
    try {
      await refreshSubscription();
    } finally {
      setSyncing(false);
    }
  }

  // Google Play Billing ainda não está integrado (Fase 9, fora do escopo
  // deste trabalho) — por enquanto, "restaurar" apenas resincroniza com o
  // que já está salvo no Firestore, e avisa claramente que não fez mais
  // que isso, em vez de fingir uma restauração real de compra.
  async function handleRestore() {
    setSyncing(true);
    try {
      const state = await refreshSubscription();
      if (state.isPremium) track(EVENTS.SUBSCRIPTION_RESTORED);
    } finally {
      setSyncing(false);
      setRestoreMsg(
        'A restauração de compras via Google Play chega junto com a integração do Billing. Por enquanto, ' +
          'sincronizamos sua assinatura com o que já está salvo na sua conta.'
      );
    }
  }

  async function handleCancel() {
    const confirmado = await confirm(
      'Cancelar sua assinatura Premium? Você continua com acesso Premium até o fim do período já pago — ' +
        'nenhum dado é apagado, e você pode assinar de novo quando quiser.'
    );
    if (!confirmado) return;
    setCanceling(true);
    try {
      await cancelWebSubscription();
      await refreshSubscription();
      track(EVENTS.SUBSCRIPTION_CANCELED);
    } catch (err) {
      await confirm(`Não foi possível cancelar agora: ${err.message}`);
    } finally {
      setCanceling(false);
    }
  }

  function handleManage() {
    if (subscription.provider === 'google_play') {
      window.open('https://play.google.com/store/account/subscriptions', '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <>
      <Topbar title="Meu Plano" icon={Crown} />
      <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col gap-4">
        {returnStatus === 'checking' && (
          <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center gap-3">
            <RefreshCw size={16} className="text-ledger-500 animate-spin shrink-0" strokeWidth={2} />
            <p className="text-sm text-ink-500">Confirmando seu pagamento com o MercadoPago...</p>
          </div>
        )}
        {returnStatus === 'pending' && (
          <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
            <p className="text-sm text-ink-500">
              Ainda estamos confirmando seu pagamento — pode levar alguns minutos. Toque em "Sincronizar assinatura"
              mais abaixo daqui a pouco, ou volte a esta página em instantes.
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-5">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">Plano {planLabel}</p>
            {isPremium && (
              <span className="rounded-pill bg-gold-50 text-gold-700 px-2.5 py-1 text-xs font-semibold flex items-center gap-1 shrink-0">
                <Crown size={12} strokeWidth={2.5} />
                Premium
              </span>
            )}
          </div>
          <p className="text-sm text-ink-500 mb-4">
            {STATUS_LABEL[subscription.status] ?? subscription.status}
            {subscription.isTrialing && subscription.trialDaysLeft != null && ` · ${subscription.trialDaysLeft} dia(s) restantes`}
          </p>

          {(subscription.currentPeriodEnd || subscription.provider) && (
            <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
              {subscription.currentPeriodEnd && (
                <div>
                  <dt className="text-xs text-ink-300">{subscription.cancelAtPeriodEnd ? 'Acesso até' : 'Renova em'}</dt>
                  <dd className="text-ink-900 dark:text-ink-50 font-medium">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                  </dd>
                </div>
              )}
              {subscription.provider && (
                <div>
                  <dt className="text-xs text-ink-300">Origem</dt>
                  <dd className="text-ink-900 dark:text-ink-50 font-medium">
                    {PROVIDER_LABEL[subscription.provider] ?? subscription.provider}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {!isPremium ? (
            <button
              onClick={() => openPaywall({})}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-ledger-500 text-white py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all"
            >
              <Crown size={16} strokeWidth={2.25} />
              Conhecer o Premium
            </button>
          ) : subscription.provider === 'google_play' ? (
            <button
              onClick={handleManage}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink-50 dark:bg-ink-900 text-ink-700 dark:text-ink-50 py-2.5 text-sm font-medium hover:bg-ink-100 transition-colors"
            >
              <CreditCard size={16} strokeWidth={2.25} />
              Gerenciar assinatura na Google Play
            </button>
          ) : subscription.provider === 'web' && !subscription.cancelAtPeriodEnd ? (
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-signal-50 text-signal-500 py-2.5 text-sm font-medium hover:bg-signal-100 transition-colors disabled:opacity-50"
            >
              <XCircle size={16} strokeWidth={2.25} />
              {canceling ? 'Cancelando...' : 'Cancelar assinatura'}
            </button>
          ) : subscription.cancelAtPeriodEnd ? (
            <p className="text-xs text-ink-300 text-center">
              Cancelamento agendado — seu acesso Premium continua até o fim do período já pago.
            </p>
          ) : (
            <p className="text-xs text-ink-300 text-center">
              Gerenciamento de assinatura via Web chega com o backend de cobrança (em preparação).
            </p>
          )}
        </div>

        {isNative && (
          <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone size={16} className="text-ledger-500" strokeWidth={1.75} />
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Restaurar compra</p>
            </div>
            <p className="text-xs text-ink-300 mb-3">
              Reinstalou o app ou trocou de aparelho? Restaure sua assinatura da Google Play aqui.
            </p>
            <button
              onClick={handleRestore}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-1.5 rounded-pill bg-ink-50 dark:bg-ink-900 text-ink-500 py-2.5 text-sm font-medium hover:bg-ink-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} strokeWidth={2} className={syncing ? 'animate-spin' : ''} />
              Restaurar compra
            </button>
            {restoreMsg && <p className="text-xs text-ink-300 mt-2">{restoreMsg}</p>}
          </div>
        )}

        <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-ledger-500" strokeWidth={1.75} />
            <p className="text-sm font-medium text-ink-900 dark:text-ink-50">O que muda no Premium</p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {PLAN_DETAILS[PLAN.PREMIUM].beneficios.map((beneficio) => (
              <li key={beneficio} className="text-sm text-ink-500 pl-2">
                • {beneficio}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleRefresh}
          disabled={syncing}
          className="text-xs text-ink-300 hover:text-ink-500 transition-colors self-center disabled:opacity-50"
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar assinatura'}
        </button>

        <p className="text-[11px] text-ink-300 text-center leading-relaxed mt-2">
          A assinatura renova automaticamente até ser cancelada, e o cancelamento preserva o acesso até o fim do
          período já pago — cancelar ou perder o Premium nunca apaga seus dados. Veja os{' '}
          <a href="/termos" className="underline hover:text-ink-500">Termos de Uso</a> e a{' '}
          <a href="/privacidade" className="underline hover:text-ink-500">Política de Privacidade</a>.
        </p>
      </div>
    </>
  );
}
