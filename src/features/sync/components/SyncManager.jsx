import { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { isNativeLocalDatabaseAvailable } from '../../../db/localDatabase.js';
import { createCloudBackup, getLastCloudBackupAt, hasPendingBackupChanges, isCloudBackupDue } from '../../../db/backup/cloudBackup.js';
import { getLocalDatabase } from '../../../db/localDatabase.js';
import { reportError } from '../../../utils/crashReporting.js';

const BACKUP_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Checks hourly, but writes a complete cloud backup at most once every 24 hours. */
export default function SyncManager() {
  const { firebaseUser } = useAuth();
  const { hasCloudAccess } = usePremium();

  useEffect(() => {
    if (!isNativeLocalDatabaseAvailable() || !firebaseUser?.uid || !hasCloudAccess) return undefined;
    let timer;
    let disposed = false;
    const checkBackup = async () => {
      if (disposed || document.visibilityState !== 'visible' || !navigator.onLine) return;
      try {
        const driver = await getLocalDatabase();
        const lastBackupAt = await getLastCloudBackupAt(firebaseUser.uid, driver);
        if (isCloudBackupDue(lastBackupAt) && await hasPendingBackupChanges(driver)) {
          await createCloudBackup(firebaseUser.uid, { driver });
        }
      } catch (error) {
        reportError(error, 'cloud_backup');
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkBackup();
    };

    checkBackup();
    timer = window.setInterval(checkBackup, BACKUP_CHECK_INTERVAL_MS);
    window.addEventListener('online', checkBackup);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('online', checkBackup);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [firebaseUser?.uid, hasCloudAccess]);

  return null;
}
