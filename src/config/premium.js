/**
 * Master switch for premium gating. Flip to `true` when the paid plan is
 * ready to launch — every check below then starts enforcing real limits.
 * While `false`, `checkGate` always allows everything, so nothing changes
 * for current users until this is flipped.
 */
export const PREMIUM_ENFORCED = false;

export const FEATURES = {
  IMPORTAR_PDF: 'importar_pdf',
  RECORRENCIAS: 'recorrencias',
  CATEGORIAS_CUSTOM: 'categorias_custom',
};

/** Free-tier caps, only enforced once PREMIUM_ENFORCED is true. */
export const FREE_LIMITS = {
  [FEATURES.RECORRENCIAS]: 2,
  [FEATURES.CATEGORIAS_CUSTOM]: 5,
};

/**
 * Whether `uid` has an active premium subscription. No billing exists yet —
 * this is the single place to plug that in later (e.g. a Stripe webhook or
 * RevenueCat entitlement writing `users/{uid}.premium` in Firestore, read
 * here instead of the hardcoded `false`).
 */
export function isPremiumUser() {
  return false;
}

/**
 * Pure gate check: PDF import is all-or-nothing (premium only), while
 * recorrências/categorias custom are "free up to N, then premium".
 * @param {string} feature - one of FEATURES
 * @param {{ uid?: string, count?: number }} [ctx] - `count` = current usage, required for capped features
 */
export function checkGate(feature, ctx = {}) {
  if (!PREMIUM_ENFORCED) return { allowed: true };
  if (isPremiumUser(ctx.uid)) return { allowed: true };

  if (feature === FEATURES.IMPORTAR_PDF) {
    return { allowed: false, reason: 'premium_required' };
  }

  const limit = FREE_LIMITS[feature];
  if (limit != null && (ctx.count ?? 0) >= limit) {
    return { allowed: false, reason: 'limit_reached', limit };
  }
  return { allowed: true };
}
