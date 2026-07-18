import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { getUserDoc, setUserDoc, updateUserDoc } from '../../../firebase/firestore.js';
import { PLAN, PRICING } from '../../../config/premium.js';

const SUBCOLLECTION = 'private';
const DOC_ID = 'subscription';

/**
 * @typedef {Object} SubscriptionDoc
 * @property {'free'|'premium'} plan
 * @property {'none'|'trialing'|'active'|'past_due'|'canceled'|'expired'} subscriptionStatus
 * @property {'google_play'|'web'|'manual'} subscriptionProvider
 * @property {string|null} subscriptionId
 * @property {import('firebase/firestore').Timestamp|null} currentPeriodEnd
 * @property {boolean} cancelAtPeriodEnd
 * @property {import('firebase/firestore').Timestamp|null} trialStartedAt
 * @property {import('firebase/firestore').Timestamp|null} trialEndsAt
 * @property {boolean} founder
 */

/** The all-free, never-subscribed starting state — the only shape the client is allowed to `create`. */
const INITIAL_SUBSCRIPTION = {
  plan: PLAN.FREE,
  subscriptionStatus: 'none',
  subscriptionProvider: 'manual',
  subscriptionId: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  trialStartedAt: null,
  trialEndsAt: null,
  founder: false,
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
 * an Admin SDK caller (Cloud Functions or scripts/grant-premium.mjs) can do
 * that — the client never gets another write to this path.
 * @returns {Promise<SubscriptionDoc>} the doc that now exists, new or pre-existing.
 */
export async function ensureSubscriptionDoc(uid) {
  const existing = await getSubscriptionDoc(uid);
  if (existing) return existing;
  await setUserDoc(uid, SUBCOLLECTION, DOC_ID, INITIAL_SUBSCRIPTION);
  return { id: DOC_ID, ...INITIAL_SUBSCRIPTION };
}

/**
 * Starts the one-time 14-day trial (Fase 7). This is the only write to this
 * doc the client can make after the initial `create` — firestore.rules only
 * allows the exact `none` -> `trialing` transition, once (the rule keys off
 * `trialStartedAt == null`, which is never true again after this succeeds),
 * so "um teste por uid" is enforced server-side, not just by UI convention.
 * Never call this speculatively — it's meant to run right after the user
 * gives explicit consent (see MeuPlanoPage/Paywall).
 */
export async function startTrial(uid) {
  await updateUserDoc(uid, SUBCOLLECTION, DOC_ID, {
    plan: PLAN.PREMIUM,
    subscriptionStatus: 'trialing',
    subscriptionProvider: 'web',
    subscriptionId: null,
    cancelAtPeriodEnd: false,
    trialStartedAt: serverTimestamp(),
    trialEndsAt: Timestamp.fromMillis(Date.now() + PRICING.trialDias * 86_400_000),
  });
  return getSubscriptionDoc(uid);
}
