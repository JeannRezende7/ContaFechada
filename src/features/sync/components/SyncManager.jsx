import { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { isNativeLocalDatabaseAvailable } from '../../../db/localDatabase.js';
import { runAutomaticSync } from '../../../db/sync/syncRuntime.js';

const INTERVAL_MS = 5 * 60 * 1000;

export default function SyncManager() {
  const { firebaseUser } = useAuth();
  const { isPremium } = usePremium();

  useEffect(() => {
    if (!isNativeLocalDatabaseAvailable() || !firebaseUser?.uid || !isPremium) return undefined;
    const run = () => {
      runAutomaticSync({ uid: firebaseUser.uid, isPremium }).catch((error) => {
        console.error('Falha no ciclo automático de sincronização.', error);
      });
    };
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    run();
    const interval = window.setInterval(run, INTERVAL_MS);
    window.addEventListener('online', run);
    window.addEventListener('contafechada:first-sync-complete', run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', run);
      window.removeEventListener('contafechada:first-sync-complete', run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [firebaseUser?.uid, isPremium]);

  return null;
}
