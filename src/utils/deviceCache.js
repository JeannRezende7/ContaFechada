import { clearDashboardMemoryCache } from '../features/dashboard/services/dashboardService.js';
import { clearSubscriptionCache } from '../features/premium/services/subscriptionCache.js';
import { db } from '../firebase/config.js';

/** Removes fast-path caches that should never cross an authentication session. */
export function clearSessionCaches(uid) {
  clearDashboardMemoryCache(uid);
  clearSubscriptionCache(uid);
}

/**
 * Removes all financial data persisted by Firestore in this browser.
 * The caller must reload the page afterward because the Firestore instance
 * has to be terminated before IndexedDB can be cleared.
 */
export async function clearDeviceData(uid) {
  clearSessionCaches(uid);
  const { clearIndexedDbPersistence, terminate } = await import('firebase/firestore');

  await terminate(db);
  try {
    await clearIndexedDbPersistence(db);
  } catch (error) {
    if (error?.code === 'failed-precondition' || error?.code === 'firestore/failed-precondition') {
      throw new Error('Feche as outras abas do Conta Fechada e tente novamente.');
    }
    throw error;
  }
}
