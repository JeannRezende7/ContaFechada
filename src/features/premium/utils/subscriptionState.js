import { PLAN } from '../../../config/premium.js';

/**
 * Converts the server-owned entitlement document into the two states used by
 * the app: free or lifetime Pro. Old recurring fields are intentionally
 * ignored so an expired subscription can never conflict with a Play purchase.
 */
export function toSubscriptionState(doc) {
  const hasProAccess = Boolean(doc?.proLifetime) || doc?.plan === PLAN.PRO;

  return {
    plan: hasProAccess ? PLAN.PRO : PLAN.FREE,
    status: hasProAccess ? 'pro' : 'free',
    isPremium: hasProAccess,
    hasProAccess,
    hasCloudAccess: false,
    provider: hasProAccess ? (doc?.subscriptionProvider ?? null) : null,
  };
}
