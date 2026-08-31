import { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { PREMIUM_ENFORCED } from '../../../config/premium.js';
import { getLocalDatabase, isNativeLocalDatabaseAvailable } from '../../../db/localDatabase.js';
import { LOCAL_FIRST_DOMAINS } from '../../../db/sync/localFirstTransfer.js';
import { recoverLegacyCloudDataOnce } from '../../../db/backup/cloudBackup.js';
import { runSyncCycle } from '../../../db/sync/runSyncCycle.js';
import { createFirestoreSyncUploader } from '../../../firebase/syncUploader.js';
import { reportError } from '../../../utils/crashReporting.js';

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

/** Keeps Android local-first while exchanging changes with Firestore later. */
export default function SyncManager() {
  const { firebaseUser } = useAuth();
  const { hasCloudAccess, loading: premiumLoading } = usePremium();

  useEffect(() => {
    const uid = firebaseUser?.uid;
    const cloudAllowed = !PREMIUM_ENFORCED || hasCloudAccess;
    if (!isNativeLocalDatabaseAvailable() || !uid || premiumLoading || !cloudAllowed) return undefined;

    let disposed = false;
    let running = null;
    const synchronize = () => {
      if (disposed || document.visibilityState !== 'visible' || !navigator.onLine) return Promise.resolve();
      if (running) return running;
      running = (async () => {
        const driver = await getLocalDatabase();
        await recoverLegacyCloudDataOnce(uid, { driver });
        const result = await runSyncCycle({
          driver,
          uid,
          uploader: createFirestoreSyncUploader(uid),
          entidades: LOCAL_FIRST_DOMAINS,
          isPremium: true,
          isOnline: navigator.onLine,
          storage: 'documents',
        });
        const downloaded = Object.values(result.downloads ?? {})
          .reduce((total, item) => total + (item?.applied ?? 0), 0);
        if (!result.skipped && downloaded > 0) {
          window.dispatchEvent(new CustomEvent('contafechada:sync-complete', { detail: result }));
        }
      })()
        .catch((error) => reportError(error, 'incremental_sync'))
        .finally(() => { running = null; });
      return running;
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') synchronize();
    };

    synchronize();
    const timer = window.setInterval(synchronize, SYNC_INTERVAL_MS);
    window.addEventListener('online', synchronize);
    window.addEventListener('contafechada:sync-pending', synchronize);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('online', synchronize);
      window.removeEventListener('contafechada:sync-pending', synchronize);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [firebaseUser?.uid, hasCloudAccess, premiumLoading]);

  return null;
}
