import { PLAN } from '../../../config/premium.js';

const GRANTS_ACCESS = new Set(['trialing', 'active', 'past_due']);

function toMillis(value) {
  if (value == null) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return null;
}

/**
 * Re-derives the *effective* status from the raw stored one plus the dated
 * fields, instead of trusting `subscriptionStatus` blindly. No backend
 * exists yet to proactively flip a stale doc (that's Fase 8/9), so the
 * client has to defensively catch the two cases that would otherwise leave
 * a user premium forever or cut them off early:
 *  - trial/active/past_due whose date has already passed -> 'expired'.
 *  - 'canceled' but still inside the paid period -> access continues
 *    (Fase 8's "cancelamento preserva acesso ate o fim do periodo pago"),
 *    reported as 'active' since that's what it behaves like until then.
 */
function deriveEffectiveStatus(doc, nowMs) {
  const { subscriptionStatus, currentPeriodEnd, trialEndsAt } = doc;
  const periodEndMs = toMillis(currentPeriodEnd);
  const trialEndMs = toMillis(trialEndsAt);

  if (subscriptionStatus === 'trialing') {
    return trialEndMs != null && trialEndMs < nowMs ? 'expired' : 'trialing';
  }
  if (subscriptionStatus === 'active' || subscriptionStatus === 'past_due') {
    return periodEndMs != null && periodEndMs < nowMs ? 'expired' : subscriptionStatus;
  }
  if (subscriptionStatus === 'canceled') {
    return periodEndMs != null && periodEndMs >= nowMs ? 'active' : 'expired';
  }
  return subscriptionStatus; // 'none' | 'expired'
}

/**
 * Converts a raw `users/{uid}/private/subscription` doc into the simple
 * state the rest of the app reasons about. `doc` may be null (no doc yet /
 * offline before first sync) — that's treated the same as a fresh free
 * account, never as premium.
 * @param {import('../services/subscriptionService.js').SubscriptionDoc|null} doc
 * @param {number} [nowMs]
 */
export function toSubscriptionState(doc, nowMs = Date.now()) {
  if (!doc) {
    return {
      plan: PLAN.FREE,
      status: 'none',
      isPremium: false,
      isTrialing: false,
      trialDaysLeft: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      provider: null,
      founder: false,
    };
  }

  const effectiveStatus = deriveEffectiveStatus(doc, nowMs);
  const isPremium = doc.plan === PLAN.PREMIUM && GRANTS_ACCESS.has(effectiveStatus);
  const isTrialing = effectiveStatus === 'trialing';

  let trialDaysLeft = null;
  if (isTrialing) {
    const trialEndMs = toMillis(doc.trialEndsAt);
    trialDaysLeft = trialEndMs != null ? Math.max(0, Math.ceil((trialEndMs - nowMs) / 86_400_000)) : null;
  }

  return {
    plan: doc.plan ?? PLAN.FREE,
    status: effectiveStatus,
    isPremium,
    isTrialing,
    trialDaysLeft,
    currentPeriodEnd: toMillis(doc.currentPeriodEnd),
    cancelAtPeriodEnd: Boolean(doc.cancelAtPeriodEnd),
    provider: doc.subscriptionProvider ?? null,
    founder: Boolean(doc.founder),
  };
}
