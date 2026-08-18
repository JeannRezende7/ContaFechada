import { getLocalDatabase } from '../localDatabase.js';
import { createFirestoreTransferAdapter, downloadRemoteSnapshot, LOCAL_FIRST_DOMAINS, persistFirstSyncBackup, recoverMissingRemoteRecords, uploadLocalSnapshot } from '../sync/localFirstTransfer.js';

export const CLOUD_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LAST_BACKUP_KEY_PREFIX = 'cloudBackup:lastAt:';
const LEGACY_RECOVERY_KEY_PREFIX = 'legacyRecovery:completedAt:';
let initialRestoreRunning;

export async function getLastCloudBackupAt(uid, driver) {
  const db = driver ?? await getLocalDatabase();
  const row = await db.get('SELECT valor FROM sync_state WHERE chave=?', [`${LAST_BACKUP_KEY_PREFIX}${uid}`]);
  return row?.valor ?? null;
}

export function isCloudBackupDue(lastBackupAt, now = Date.now()) {
  if (!lastBackupAt) return true;
  const timestamp = new Date(lastBackupAt).getTime();
  return !Number.isFinite(timestamp) || now - timestamp >= CLOUD_BACKUP_INTERVAL_MS;
}

export async function hasPendingBackupChanges(driver) {
  const row = await driver.get('SELECT COUNT(*) AS count FROM sync_queue');
  return Number(row?.count) > 0;
}

export async function createCloudBackup(uid, { driver, remote, now = () => new Date() } = {}) {
  const db = driver ?? await getLocalDatabase();
  const result = await uploadLocalSnapshot({ driver: db, remote: remote ?? createFirestoreTransferAdapter(uid) });
  const completedAt = now().toISOString();
  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM sync_queue');
    await tx.run('DELETE FROM local_documents WHERE deleted_at IS NOT NULL');
    await tx.run("UPDATE local_documents SET sync_status='synced'");
    await tx.run('INSERT OR REPLACE INTO sync_state (chave,valor) VALUES (?,?)', [`${LAST_BACKUP_KEY_PREFIX}${uid}`, completedAt]);
  });
  return { ...result, completedAt };
}

export async function restoreCloudBackup(uid, { driver, remote } = {}) {
  const db = driver ?? await getLocalDatabase();
  const adapter = remote ?? createFirestoreTransferAdapter(uid);
  const remoteCounts = await Promise.all(LOCAL_FIRST_DOMAINS.map(async (domain) => (await adapter.list(domain)).length));
  if (remoteCounts.every((count) => count === 0)) throw new Error('Nenhum backup em nuvem foi encontrado para esta conta.');
  const safetyBackup = await persistFirstSyncBackup(db);
  const result = await downloadRemoteSnapshot({ driver: db, remote: adapter, replace: true });
  return { ...result, safetyBackup };
}

/** Restores legacy/cloud data only on a truly empty installation. */
export async function restoreCloudBackupIfLocalEmpty(uid, { driver, remote } = {}) {
  if (initialRestoreRunning) return initialRestoreRunning;
  initialRestoreRunning = (async () => {
    const db = driver ?? await getLocalDatabase();
    const local = await db.get('SELECT COUNT(*) AS count FROM local_documents WHERE deleted_at IS NULL');
    if (Number(local?.count) > 0) return { restored: false, reason: 'local_not_empty' };

    const adapter = remote ?? createFirestoreTransferAdapter(uid);
    const remoteCounts = await Promise.all(LOCAL_FIRST_DOMAINS.map(async (domain) => (await adapter.list(domain)).length));
    const remoteCount = remoteCounts.reduce((total, count) => total + count, 0);
    if (remoteCount === 0) return { restored: false, reason: 'cloud_empty' };

    const safetyBackup = await persistFirstSyncBackup(db);
    const result = await downloadRemoteSnapshot({ driver: db, remote: adapter, replace: true });
    return { ...result, safetyBackup, remoteCount, restored: true };
  })().finally(() => { initialRestoreRunning = undefined; });
  return initialRestoreRunning;
}

/** One-time repair for legacy records without updatedAt skipped by incremental sync. */
export async function recoverLegacyCloudDataOnce(uid, { driver, remote } = {}) {
  const db = driver ?? await getLocalDatabase();
  const key = `${LEGACY_RECOVERY_KEY_PREFIX}${uid}`;
  if (await db.get('SELECT valor FROM sync_state WHERE chave=?', [key])) {
    return { recovered: 0, reason: 'already_completed' };
  }

  const result = await recoverMissingRemoteRecords({
    driver: db,
    remote: remote ?? createFirestoreTransferAdapter(uid),
  });
  await db.run('INSERT OR REPLACE INTO sync_state (chave,valor) VALUES (?,?)', [key, new Date().toISOString()]);
  return result;
}
