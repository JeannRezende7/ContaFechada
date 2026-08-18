import { toSubscriptionState } from '../utils/subscriptionState.js';

const PREFIX = 'contafechada-premium-';

function cacheKey(uid) {
  return `${PREFIX}${uid}`;
}

function toCacheable(doc) {
  return {
    plan: doc.plan,
    proLifetime: Boolean(doc.proLifetime),
    subscriptionProvider: doc.subscriptionProvider,
  };
}

export function readSubscriptionCache(uid) {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSubscriptionCache(uid, doc) {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(toCacheable(doc)));
  } catch {
    // This cache is only a fast-path; Firestore remains the source of truth.
  }
}

export function clearSubscriptionCache(uid) {
  try {
    if (uid) {
      localStorage.removeItem(cacheKey(uid));
      return;
    }
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key?.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Storage may be unavailable in private browsing.
  }
}

export function readSubscriptionStateFromCache(uid) {
  const cached = readSubscriptionCache(uid);
  return cached ? toSubscriptionState(cached) : null;
}
