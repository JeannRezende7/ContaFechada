import { listUserDocsUpdatedSince } from '../../firebase/firestore.js';
import { getLocalDatabase } from '../localDatabase.js';
import { createFirestoreTransferAdapter, LOCAL_FIRST_DOMAINS } from './localFirstTransfer.js';
import { readFirstSyncState } from './firstSyncController.js';
import { runSyncCycle } from './runSyncCycle.js';

const REMOTE_COLLECTION = { configuracoes: 'config' };
const DOMAIN_BATCH_SIZE = 2;
let running;
let domainCursor = 0;

export function selectNextSyncDomains(domains = LOCAL_FIRST_DOMAINS, batchSize = DOMAIN_BATCH_SIZE) {
  if (!domains.length || batchSize <= 0) return [];
  const count = Math.min(batchSize, domains.length);
  const selected = Array.from({ length: count }, (_, offset) =>
    domains[(domainCursor + offset) % domains.length]
  );
  domainCursor = (domainCursor + count) % domains.length;
  return selected;
}

export function resetSyncDomainCursorForTests() {
  domainCursor = 0;
}

export async function purgeConfirmedTombstones(driver) {
  const result = await driver.run(
    `DELETE FROM local_documents
     WHERE deleted_at IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM sync_queue
         WHERE entidade=local_documents.dominio AND registro_id=local_documents.id
       )`
  );
  return result.changes;
}

export async function runAutomaticSync({
  uid,
  isPremium,
  isOnline = navigator.onLine,
  uploadOnly = false,
  domains,
}) {
  if (running) return running;
  running = (async () => {
    const driver = await getLocalDatabase();
    const localCount = (await driver.get(
      'SELECT COUNT(*) AS count FROM local_documents WHERE deleted_at IS NULL'
    )).count;
    const firstSync = await readFirstSyncState(driver, `firstSync:workflow:${uid}`);
    if (localCount > 0 && firstSync.status !== 'completed') {
      return { skipped: true, reason: 'primeira_sincronizacao_pendente' };
    }
    const remote = createFirestoreTransferAdapter(uid);
    const selectedDomains = uploadOnly ? [] : (domains ?? selectNextSyncDomains());
    const result = await runSyncCycle({
      driver,
      uid,
      uploader: remote,
      entidades: selectedDomains,
      isPremium,
      isOnline,
      storage: 'documents',
      fetchChangedSince: (domain, since) =>
        listUserDocsUpdatedSince(uid, REMOTE_COLLECTION[domain] ?? domain, since),
    });
    if (!result.skipped) await purgeConfirmedTombstones(driver);
    return { ...result, domains: selectedDomains };
  })().finally(() => { running = undefined; });
  return running;
}

export function isAutomaticSyncRunning() {
  return Boolean(running);
}
