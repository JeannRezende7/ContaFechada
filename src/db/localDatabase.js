import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { createCapacitorSqliteDriver } from './drivers/capacitorSqliteDriver.js';
import { migrations } from './migrations/index.js';
import { runMigrations } from './migrationRunner.js';
import { getDeviceId } from '../utils/deviceId.js';

let driverPromise;
let sqliteConnection;
let databaseConnection;

export class LocalDatabaseError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'LocalDatabaseError';
  }
}

export function isNativeLocalDatabaseAvailable() {
  return Capacitor.isNativePlatform();
}

export function getLocalDatabase() {
  if (!isNativeLocalDatabaseAvailable()) {
    return Promise.reject(new Error('SQLite local está disponível somente no aplicativo nativo.'));
  }
  if (!driverPromise) {
    driverPromise = (async () => {
      sqliteConnection = new SQLiteConnection(CapacitorSQLite);
      await sqliteConnection.checkConnectionsConsistency();
      const existing = await sqliteConnection.isConnection('contafechada', false);
      databaseConnection = existing.result
        ? await sqliteConnection.retrieveConnection('contafechada', false)
        : await sqliteConnection.createConnection('contafechada', false, 'no-encryption', 1, false);
      await databaseConnection.open();
      const driver = createCapacitorSqliteDriver(databaseConnection);
      await runMigrations(driver, migrations);
      const integrity = await driver.get('PRAGMA quick_check');
      const result = integrity ? Object.values(integrity)[0] : null;
      if (result !== 'ok') throw new LocalDatabaseError(`Falha na verificação de integridade: ${result || 'sem resposta'}`);
      return driver;
    })().catch((error) => {
      driverPromise = undefined;
      throw error instanceof LocalDatabaseError
        ? error
        : new LocalDatabaseError('Não foi possível abrir ou migrar o banco local.', error);
    });
  }
  return driverPromise;
}

export function resetLocalDatabaseForTests() {
  driverPromise = undefined;
}

export async function retryLocalDatabase() {
  driverPromise = undefined;
  return getLocalDatabase();
}

export async function recreateLocalDatabase() {
  if (!isNativeLocalDatabaseAvailable()) throw new Error('Operação disponível somente no aplicativo nativo.');
  try {
    if (databaseConnection) await databaseConnection.close();
  } finally {
    if (!sqliteConnection) sqliteConnection = new SQLiteConnection(CapacitorSQLite);
    await sqliteConnection.deleteDatabase('contafechada', false);
    databaseConnection = undefined;
    driverPromise = undefined;
  }
  return getLocalDatabase();
}

export async function exportLocalData() {
  const driver = await getLocalDatabase();
  const rows = await driver.all(
    'SELECT dominio,id,dados,created_at,updated_at,deleted_at,device_id,local_version FROM local_documents ORDER BY dominio,id'
  );
  return rows.reduce((result, row) => {
    if (row.deleted_at) return result;
    result[row.dominio] ??= [];
    result[row.dominio].push({
      id: row.id,
      ...JSON.parse(row.dados),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deviceId: row.device_id,
      localVersion: row.local_version,
    });
    return result;
  }, {});
}

export async function clearLocalData() {
  const driver = await getLocalDatabase();
  await driver.transaction(async (tx) => {
    await tx.run('DELETE FROM local_documents');
    await tx.run('DELETE FROM sync_queue');
    await tx.run("DELETE FROM sync_state WHERE chave NOT LIKE 'schema_%'");
    await tx.run('DELETE FROM conflict_log');
  });
}

export async function importLocalData(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('Backup JSON inválido.');
  }
  const entries = [];
  for (const [domain, items] of Object.entries(snapshot)) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(domain) || !Array.isArray(items)) {
      throw new TypeError(`Domínio inválido no backup: ${domain}`);
    }
    for (const item of items) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id) {
        throw new TypeError(`Registro inválido em ${domain}.`);
      }
      entries.push({ domain, item });
    }
  }
  if (entries.length > 100_000) throw new TypeError('Backup excede o limite de 100.000 registros.');

  const driver = await getLocalDatabase();
  const previous = await exportLocalData();
  const recoveryKey = `localImport:backup:${new Date().toISOString()}`;
  await driver.run('INSERT OR REPLACE INTO sync_state (chave,valor) VALUES (?,?)', [
    recoveryKey, JSON.stringify(previous),
  ]);
  const now = new Date().toISOString();
  await driver.transaction(async (tx) => {
    await tx.run('DELETE FROM local_documents');
    await tx.run('DELETE FROM sync_queue');
    for (const { domain, item } of entries) {
      const {
        id, createdAt, updatedAt, deletedAt, deviceId, localVersion,
        syncStatus: _syncStatus, ...data
      } = item;
      await tx.run(
        `INSERT INTO local_documents
          (dominio,id,dados,created_at,updated_at,deleted_at,device_id,sync_status,local_version)
         VALUES (?,?,?,?,?,?,?,'local',?)`,
        [
          domain, id, JSON.stringify(data), createdAt || now, updatedAt || now,
          deletedAt || null, deviceId || getDeviceId(), Number(localVersion) || 1,
        ]
      );
      await tx.run(
        `INSERT INTO sync_queue
          (id,entidade,registro_id,operacao,payload,status,tentativas,created_at)
         VALUES (?,?,?,?,?,'pending',0,?)`,
        [
          `${domain}:${id}:${crypto.randomUUID()}`, domain, id,
          deletedAt ? 'delete' : 'create',
          deletedAt ? null : JSON.stringify({ id, ...data }),
          now,
        ]
      );
    }
  });
  return { imported: entries.length, recoveryKey };
}

export async function getLatestRecoverySnapshot() {
  const driver = await getLocalDatabase();
  const row = await driver.get(
    `SELECT chave,valor FROM sync_state
     WHERE chave LIKE 'firstSync:backup:%' OR chave LIKE 'localImport:backup:%'
     ORDER BY chave DESC LIMIT 1`
  );
  if (!row) return null;
  return { key: row.chave, snapshot: JSON.parse(row.valor) };
}

export async function restoreLatestRecoverySnapshot() {
  const recovery = await getLatestRecoverySnapshot();
  if (!recovery) throw new Error('Nenhum snapshot de recuperação disponível.');
  const result = await importLocalData(recovery.snapshot);
  return { ...result, restoredFrom: recovery.key };
}
