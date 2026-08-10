import { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { isNativeLocalDatabaseAvailable } from '../../../db/localDatabase.js';
import { runAutomaticSync } from '../../../db/sync/syncRuntime.js';

const BASE_INTERVAL_MS = 30 * 60 * 1000;
const MAX_INTERVAL_MS = 4 * 60 * 60 * 1000;
const EDIT_DEBOUNCE_MS = 2 * 1000;

export function nextSyncIntervalMs(emptyCycles) {
  const backoffLevel = Math.floor(Math.max(0, emptyCycles) / 3);
  return Math.min(BASE_INTERVAL_MS * (2 ** backoffLevel), MAX_INTERVAL_MS);
}

export default function SyncManager() {
  const { firebaseUser } = useAuth();
  const { isPremium } = usePremium();

  useEffect(() => {
    if (!isNativeLocalDatabaseAvailable() || !firebaseUser?.uid || !isPremium) return undefined;
    let periodicTimer;
    let editTimer;
    let emptyCycles = 0;
    let disposed = false;

    const clearTimers = () => {
      window.clearTimeout(periodicTimer);
      window.clearTimeout(editTimer);
    };
    const schedulePeriodic = () => {
      window.clearTimeout(periodicTimer);
      if (disposed || document.visibilityState !== 'visible') return;
      periodicTimer = window.setTimeout(async () => {
        await run(false);
        schedulePeriodic();
      }, nextSyncIntervalMs(emptyCycles));
    };
    const run = async (uploadOnly = false) => {
      if (disposed || document.visibilityState !== 'visible') return null;
      try {
        const result = await runAutomaticSync({ uid: firebaseUser.uid, isPremium, uploadOnly });
        if (!uploadOnly && result && !result.skipped) {
          const downloaded = Object.values(result.downloads ?? {})
            .reduce((total, item) => total + (item?.applied ?? 0), 0);
          const changed = downloaded > 0 || (result.upload?.processed ?? 0) > 0;
          emptyCycles = changed ? 0 : Math.min(emptyCycles + 1, 9);
        }
        return result;
      } catch (error) {
        console.error('Falha no ciclo automático de sincronização.', error);
        return null;
      }
    };
    const triggerIncremental = async () => {
      await run(false);
      schedulePeriodic();
    };
    const onPending = () => {
      window.clearTimeout(editTimer);
      if (document.visibilityState !== 'visible') return;
      editTimer = window.setTimeout(() => run(true), EDIT_DEBOUNCE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') triggerIncremental();
      else clearTimers();
    };
    triggerIncremental();
    window.addEventListener('online', triggerIncremental);
    window.addEventListener('contafechada:first-sync-complete', triggerIncremental);
    window.addEventListener('contafechada:sync-pending', onPending);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      clearTimers();
      window.removeEventListener('online', triggerIncremental);
      window.removeEventListener('contafechada:first-sync-complete', triggerIncremental);
      window.removeEventListener('contafechada:sync-pending', onPending);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [firebaseUser?.uid, isPremium]);

  return null;
}
