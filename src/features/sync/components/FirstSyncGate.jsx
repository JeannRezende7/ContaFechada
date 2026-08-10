import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { getLocalDatabase, isNativeLocalDatabaseAvailable } from '../../../db/localDatabase.js';
import { createFirstSyncController, readFirstSyncState } from '../../../db/sync/firstSyncController.js';
import {
  createFirestoreTransferAdapter,
  downloadRemoteSnapshot,
  mergeLocalAndRemoteSnapshots,
  persistFirstSyncBackup,
  previewLocalFirstTransfer,
  uploadLocalSnapshot,
} from '../../../db/sync/localFirstTransfer.js';
import FirstSyncFlow from './FirstSyncFlow.jsx';

export default function FirstSyncGate({ children }) {
  const { firebaseUser } = useAuth();
  const [controller, setController] = useState(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isNativeLocalDatabaseAvailable() || !firebaseUser?.uid) {
      setComplete(true);
      return undefined;
    }
    (async () => {
      const driver = await getLocalDatabase();
      const count = (await driver.get('SELECT COUNT(*) AS count FROM local_documents WHERE deleted_at IS NULL')).count;
      const stateKey = `firstSync:workflow:${firebaseUser.uid}`;
      const state = await readFirstSyncState(driver, stateKey);
      if (!active) return;
      if (count === 0 || state.status === 'completed') {
        setComplete(true);
        return;
      }
      const remote = createFirestoreTransferAdapter(firebaseUser.uid);
      setController(createFirstSyncController({
        driver,
        uid: firebaseUser.uid,
        stateKey,
        previewFirstSync: () => previewLocalFirstTransfer({ driver, remote }),
        createBackup: () => persistFirstSyncBackup(driver),
        upload: () => uploadLocalSnapshot({ driver, remote }),
        download: () => downloadRemoteSnapshot({ driver, remote, replace: true }),
        merge: () => mergeLocalAndRemoteSnapshots({ driver, remote }),
      }));
    })();
    return () => { active = false; };
  }, [firebaseUser?.uid]);

  if (complete) return children;
  if (!controller) return <p role="status" className="p-6 text-sm text-ink-300">Preparando seus dados locais…</p>;
  return (
    <main className="mx-auto max-w-3xl px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] md:p-8">
      <FirstSyncFlow controller={controller} onComplete={() => {
        setComplete(true);
        window.dispatchEvent(new Event('contafechada:first-sync-complete'));
      }} />
    </main>
  );
}
