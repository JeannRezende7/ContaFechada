import { getUserDoc, setUserDoc } from '../../../firebase/firestore.js';
import { PLAN } from '../../../config/premium.js';

const SUBCOLLECTION = 'private';
const DOC_ID = 'subscription';

/**
 * @typedef {Object} SubscriptionDoc
 * @property {'free'|'pro'} plan
 * @property {boolean} proLifetime
 * @property {'google_play'|'manual'|null} subscriptionProvider
 */

/** The all-free, never-subscribed starting state — the only shape the client is allowed to `create`. */
const INITIAL_SUBSCRIPTION = {
  plan: PLAN.FREE,
  proLifetime: false,
  subscriptionStatus: 'none',
  subscriptionProvider: null,
};

export function getSubscriptionDoc(uid) {
  return getUserDoc(uid, SUBCOLLECTION, DOC_ID);
}

/**
 * Creates the subscription doc on first login. A no-op if it already
 * exists — Firestore Rules only allow `create` with the free/none shape
 * (see firestore.rules), so this must never attempt to overwrite an
 * existing doc: that would be evaluated as an `update` and rejected.
 * Every field beyond plan/subscriptionStatus must upgrade later, and only
 * an Admin SDK caller (Cloud Functions or scripts/grant-premium-lifetime.mjs) can do
 * that — the client never gets another write to this path.
 * @returns {Promise<SubscriptionDoc>} the doc that now exists, new or pre-existing.
 */
export async function ensureSubscriptionDoc(uid) {
  const existing = await getSubscriptionDoc(uid);
  if (existing) return existing;
  await setUserDoc(uid, SUBCOLLECTION, DOC_ID, INITIAL_SUBSCRIPTION);
  return { id: DOC_ID, ...INITIAL_SUBSCRIPTION };
}
