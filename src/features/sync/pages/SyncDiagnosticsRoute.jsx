import { Capacitor } from '@capacitor/core';
import { getLocalDatabase, isNativeLocalDatabaseAvailable } from '../../../db/localDatabase.js';
import { getSyncHealth } from '../../../db/sync/syncHealth.js';
import { retryFailed } from '../../../db/sync/syncQueue.js';
import { LOCAL_FIRST_DOMAINS } from '../../../db/sync/localFirstTransfer.js';
import SyncDiagnosticsPage from './SyncDiagnosticsPage.jsx';

async function loadHealth() {
  const driver = await getLocalDatabase();
  return getSyncHealth({ driver, entidades: LOCAL_FIRST_DOMAINS });
}

async function retryErrors() {
  const driver = await getLocalDatabase();
  const rows = await driver.all("SELECT id FROM sync_queue WHERE status='error'");
  for (const row of rows) await retryFailed(driver, row.id);
}

export default function SyncDiagnosticsRoute() {
  if (!isNativeLocalDatabaseAvailable()) {
    return <main className="px-6 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-sm text-ink-300">O diagnóstico de sincronização está disponível no aplicativo Android.</main>;
  }
  return (
    <SyncDiagnosticsPage
      loadHealth={loadHealth}
      retryErrors={retryErrors}
      platform={Capacitor.getPlatform()}
    />
  );
}
