import { useMemo, useState } from 'react';
import { Crown, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { GOOGLE_PLAY_PRODUCTS, PRICING } from '../../../config/premium.js';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { createPlayBillingService } from '../services/playBilling.js';
import { createNativePlayBillingAdapter } from '../services/nativePlayBilling.js';
import PlanComparisonTable from './PlanComparisonTable.jsx';

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Paywall({ onClose }) {
  const confirm = useConfirm();
  const { firebaseUser, isLocalSession } = useAuth();
  const { refreshSubscription } = usePremium();
  const [loading, setLoading] = useState(null);
  const title = 'Remover anúncios';
  const description = 'Todas as funções já estão liberadas. Faça uma compra única para usar o aplicativo sem anúncios para sempre.';
  const billing = useMemo(() => createPlayBillingService({
    adapter: createNativePlayBillingAdapter(),
    getIdToken: () => firebaseUser?.getIdToken(true),
  }), [firebaseUser]);

  async function requireAccount() {
    if (firebaseUser && !isLocalSession) return true;
    await confirm('Entre com sua conta Google antes de comprar. Assim a remoção de anúncios poderá ser recuperada em outro aparelho. Seus dados continuam armazenados localmente.');
    return false;
  }

  async function handlePurchase() {
    if (!await requireAccount()) return;
    setLoading('purchase');
    try {
      const result = await billing.purchase(GOOGLE_PLAY_PRODUCTS.PRO_LIFETIME, { obfuscatedAccountId: firebaseUser.uid });
      if (result.pending) {
        await confirm('Pagamento pendente. Os anúncios serão removidos quando a Google Play confirmar o pagamento.');
        return;
      }
      await refreshSubscription();
      await confirm('Compra confirmada. Os anúncios foram removidos permanentemente.');
      onClose();
    } catch (error) {
      if (error?.code !== 'USER_CANCELED' && !String(error?.message).toLowerCase().includes('cancelada')) {
        await confirm(error?.message || 'Não foi possível concluir a compra. Tente novamente.');
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleRestore() {
    if (!await requireAccount()) return;
    setLoading('restore');
    try {
      const results = await billing.restore();
      const restored = results.some((item) => item.ok && !item.pending);
      if (!restored) {
        await confirm(results.some((item) => item.pending)
          ? 'Existe um pagamento pendente. A liberação ocorrerá depois da confirmação da Google Play.'
          : 'Nenhuma compra para remover anúncios foi encontrada nesta conta da Google Play.');
        return;
      }
      await refreshSubscription();
      await confirm('Compra restaurada. Os anúncios foram removidos neste aparelho.');
      onClose();
    } catch (error) {
      await confirm(error?.message || 'Não foi possível restaurar a compra.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-900/50 px-3 py-[max(0.75rem,env(safe-area-inset-top))]" onClick={onClose}>
      <div className="relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-card bg-white p-4 shadow-pop sm:p-5 dark:bg-ink-700" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 text-ink-300 hover:text-ink-700 dark:hover:text-ink-50"><X size={18} /></button>
        <div className="mb-5 flex items-start gap-3 pr-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-700"><Sparkles size={19} /></span>
          <div><p className="font-semibold text-ink-900 dark:text-ink-50">{title}</p><p className="mt-1 text-sm text-ink-500">{description}</p></div>
        </div>
        <div className="mb-4 rounded-card bg-ink-50/60 p-3 dark:bg-ink-900/60"><PlanComparisonTable /></div>
        <div className="mb-4 text-center">
          <p className="text-xs text-ink-300">Pagamento único</p>
          <p className="mt-1 font-display text-3xl font-semibold text-ink-900 dark:text-ink-50">{formatBRL(PRICING.proLifetime)}</p>
          <p className="mt-1 text-xs text-ink-300">Remoção permanente dos anúncios neste e nos próximos aparelhos.</p>
        </div>
        <button type="button" onClick={handlePurchase} disabled={Boolean(loading)} className="flex min-h-11 w-full flex-wrap items-center justify-center gap-2 rounded-xl bg-ledger-500 px-3 py-2.5 text-center text-sm font-semibold leading-snug text-white hover:bg-ledger-600 disabled:opacity-60">
          {loading === 'purchase' ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />} Remover anúncios
        </button>
        <button type="button" onClick={handleRestore} disabled={Boolean(loading)} className="mt-2 flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-ink-500 disabled:opacity-60">
          {loading === 'restore' ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Restaurar compra
        </button>
      </div>
    </div>
  );
}
