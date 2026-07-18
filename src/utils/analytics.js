import { logEvent as firebaseLogEvent } from 'firebase/analytics';
import { analyticsReady } from '../firebase/config.js';

/**
 * Event catalog (ROADMAP_MONETIZACAO.txt, Fase 10 "Eventos minimos") — one
 * named export per event, called from wherever the corresponding user
 * action/state transition happens. Every call is fire-and-forget: analytics
 * must never be able to break or slow down the feature it's observing.
 */
export const EVENTS = {
  PREMIUM_CARD_VIEWED: 'premium_card_viewed',
  PREMIUM_CARD_CLICKED: 'premium_card_clicked',
  PAYWALL_OPENED: 'paywall_opened',
  PAYWALL_CLOSED: 'paywall_closed',
  FREE_LIMIT_REACHED: 'free_limit_reached',
  TRIAL_STARTED: 'trial_started',
  TRIAL_FINISHED: 'trial_finished',
  CHECKOUT_STARTED: 'checkout_started',
  PURCHASE_COMPLETED: 'purchase_completed',
  PURCHASE_FAILED: 'purchase_failed',
  PURCHASE_CANCELED: 'purchase_canceled',
  SUBSCRIPTION_RESTORED: 'subscription_restored',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
};

/**
 * Logs `event` with `params` once Analytics resolves (or silently does
 * nothing if unavailable — see `analyticsReady` in firebase/config.js).
 * Never awaited by callers, never throws into caller code.
 */
export function track(event, params = {}) {
  analyticsReady
    .then((analytics) => {
      if (analytics) firebaseLogEvent(analytics, event, params);
    })
    .catch(() => {
      // Analytics é observação, nunca deve derrubar a ação que está observando.
    });
}
