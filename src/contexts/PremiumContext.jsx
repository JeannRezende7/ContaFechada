import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { checkGate, getLimit } from '../config/premium.js';
import {
  ensureSubscriptionDoc,
  getSubscriptionDoc,
} from '../features/premium/services/subscriptionService.js';
import { toSubscriptionState } from '../features/premium/utils/subscriptionState.js';
import {
  readSubscriptionCache,
  writeSubscriptionCache,
} from '../features/premium/services/subscriptionCache.js';
import { track, EVENTS } from '../utils/analytics.js';
import { lazyWithRetry } from '../utils/lazyWithRetry.js';
import { GOOGLE_PLAY_PRODUCTS } from '../config/premium.js';
import { createPlayBillingService } from '../features/premium/services/playBilling.js';
import { createNativePlayBillingAdapter } from '../features/premium/services/nativePlayBilling.js';

const PremiumContext = createContext(null);
const Paywall = lazyWithRetry(() => import('../features/premium/components/Paywall.jsx'));

const FREE_STATE = toSubscriptionState(null);

/**
 * `guardFeature(feature, ctx)` returns true/false synchronously — if false,
 * it also opens the paywall, so callers just do
 * `if (!guardFeature(...)) return;` right before the gated action.
 *
 * `canUse(feature, ctx)` is the same check with no side effect, for
 * read-only decisions (hiding a button, disabling an input) that shouldn't
 * pop a paywall on their own.
 */
export function PremiumProvider({ children }) {
  const { user, firebaseUser, isLocalSession } = useAuth();
  const uid = user?.uid;

  const [state, setState] = useState(FREE_STATE);
  const [loading, setLoading] = useState(true);
  const [paywall, setPaywall] = useState(null); // { feature, reason, limit } | null
  const automaticRestoreUidRef = useRef(null);

  // Único ponto de saída pro estado — assim "trial acabou" é detectado não
  // importa se a mudança veio do cache, da rede ou de um refresh manual.
  const applyState = useCallback((next) => {
    setState(next);
  }, []);

  useEffect(() => {
    if (!uid || isLocalSession) {
      applyState(FREE_STATE);
      setLoading(false);
      setPaywall(null);
      return;
    }

    let cancelled = false;

    // Paint instantly from the last known state (if any) so a returning
    // premium user never sees a false "free" flash while the network call
    // below is in flight — this is what "evitar paywall incorreto enquanto
    // o plano carrega" means in practice.
    const cached = readSubscriptionCache(uid);
    if (cached) applyState(toSubscriptionState(cached));
    setLoading(true);

    ensureSubscriptionDoc(uid)
      .then((doc) => {
        if (cancelled) return;
        applyState(toSubscriptionState(doc));
        writeSubscriptionCache(uid, doc);
      })
      .catch(() => {
        // Rede indisponível: mantém o estado do cache (se houver) em vez de
        // rebaixar o assinante para Gratuito por causa de uma falha de rede —
        // exigência explícita da Fase 3.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uid, isLocalSession, applyState]);

  const refreshSubscription = useCallback(async () => {
    if (!uid || isLocalSession) return FREE_STATE;
    const doc = await getSubscriptionDoc(uid);
    const next = toSubscriptionState(doc);
    applyState(next);
    if (doc) writeSubscriptionCache(uid, doc);
    return next;
  }, [uid, isLocalSession, applyState]);

  useEffect(() => {
    if (!firebaseUser?.uid || isLocalSession || loading || state.hasProAccess) return;
    if (automaticRestoreUidRef.current === firebaseUser.uid) return;
    automaticRestoreUidRef.current = firebaseUser.uid;
    const billing = createPlayBillingService({
      adapter: createNativePlayBillingAdapter(),
      getIdToken: () => firebaseUser.getIdToken(true),
    });
    billing.restore()
      .then((results) => {
        const restored = results.some((item) => item.ok && !item.pending && item.purchase.productId === GOOGLE_PLAY_PRODUCTS.PRO_LIFETIME);
        if (restored) return refreshSubscription();
        return null;
      })
      .catch(() => {});
  }, [firebaseUser, isLocalSession, loading, refreshSubscription, state.hasProAccess]);

  const canUse = useCallback(
    (feature, ctx = {}) => checkGate(feature, { ...ctx, isPremium: state.isPremium }).allowed,
    [state.isPremium]
  );

  const guardFeature = useCallback(
    (feature, ctx = {}) => {
      // Enquanto o plano ainda está resolvendo (primeira carga, sem cache),
      // não bloqueia — evita negar acesso a um assinante real por um
      // instante de loading. `canUse` acima não tem essa concessão porque é
      // usado para decisões silenciosas (esconder um botão), não para travar
      // uma ação que o usuário acabou de tomar.
      if (loading) return true;

      const result = checkGate(feature, { ...ctx, isPremium: state.isPremium });
      if (!result.allowed) {
        setPaywall({ feature, reason: result.reason, limit: result.limit });
        track(EVENTS.PAYWALL_OPENED, { feature, reason: result.reason });
        if (result.reason === 'limit_reached') track(EVENTS.FREE_LIMIT_REACHED, { feature, limit: result.limit });
      }
      return result.allowed;
    },
    [state.isPremium, loading]
  );

  const openPaywall = useCallback((ctx = {}) => {
    const reason = ctx.reason ?? 'discovery';
    setPaywall({ feature: ctx.feature ?? null, reason, limit: ctx.limit });
    track(EVENTS.PAYWALL_OPENED, { feature: ctx.feature ?? null, reason });
    if (reason === 'limit_reached') track(EVENTS.FREE_LIMIT_REACHED, { feature: ctx.feature, limit: ctx.limit });
  }, []);

  const closePaywall = useCallback(() => {
    setPaywall(null);
    track(EVENTS.PAYWALL_CLOSED);
  }, []);

  const value = useMemo(
    () => ({
      plan: state.plan,
      subscription: state,
      isPremium: state.isPremium,
      hasProAccess: state.hasProAccess,
      hasCloudAccess: state.hasCloudAccess,
      loading,
      canUse,
      getLimit,
      guardFeature,
      openPaywall,
      refreshSubscription,
    }),
    [state, loading, canUse, guardFeature, openPaywall, refreshSubscription]
  );

  return (
    <PremiumContext.Provider value={value}>
      {children}
      {paywall && (
        <Suspense fallback={null}>
          <Paywall open context={paywall} onClose={closePaywall} />
        </Suspense>
      )}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium deve ser usado dentro de <PremiumProvider>');
  return ctx;
}
