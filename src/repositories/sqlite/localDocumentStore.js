import { getDeviceId } from '../../utils/deviceId.js';
import { enqueue } from '../../db/sync/syncQueue.js';

function parse(row) {
  if (!row) return null;
  return {
    id: row.id,
    ...JSON.parse(row.dados),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    deviceId: row.device_id,
    syncStatus: row.sync_status,
    localVersion: row.local_version,
  };
}

export function createLocalDocumentStore(driver) {
  async function list(domain) {
    const rows = await driver.all(
      'SELECT * FROM local_documents WHERE dominio = ? AND deleted_at IS NULL ORDER BY created_at ASC',
      [domain]
    );
    return rows.map(parse);
  }

  async function get(domain, id) {
    return parse(await driver.get(
      'SELECT * FROM local_documents WHERE dominio = ? AND id = ? AND deleted_at IS NULL',
      [domain, id]
    ));
  }

  async function put(domain, data, { id = crypto.randomUUID(), operation = 'create' } = {}) {
    const now = new Date().toISOString();
    const clean = { ...data };
    delete clean.id;
    delete clean.createdAt;
    delete clean.updatedAt;
    delete clean.deletedAt;
    delete clean.deviceId;
    delete clean.syncStatus;
    delete clean.localVersion;
    await driver.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO local_documents
          (dominio,id,dados,created_at,updated_at,deleted_at,device_id,sync_status,local_version)
         VALUES (?,?,?,?,?,NULL,?,'local',1)
         ON CONFLICT(dominio,id) DO UPDATE SET
          dados=excluded.dados,updated_at=excluded.updated_at,deleted_at=NULL,
          device_id=excluded.device_id,
          sync_status=CASE WHEN local_documents.sync_status='synced' THEN 'pending' ELSE local_documents.sync_status END,
          local_version=local_documents.local_version+1`,
        [domain, id, JSON.stringify(clean), now, now, getDeviceId()]
      );
      await enqueue(tx, {
        entidade: domain,
        registroId: id,
        operacao: operation,
        payload: { id, ...clean },
      });
    });
    return id;
  }

  async function patch(domain, id, changes) {
    const current = await get(domain, id);
    if (!current) return;
    return put(domain, { ...current, ...changes }, { id, operation: 'update' });
  }

  async function remove(domain, id) {
    const current = await get(domain, id);
    if (!current) return;
    const now = new Date().toISOString();
    await driver.transaction(async (tx) => {
      await tx.run(
        `UPDATE local_documents SET deleted_at=?,updated_at=?,sync_status='pending',
         local_version=local_version+1 WHERE dominio=? AND id=?`,
        [now, now, domain, id]
      );
      await enqueue(tx, { entidade: domain, registroId: id, operacao: 'delete', payload: null });
      const queued = await tx.get(
        'SELECT id FROM sync_queue WHERE entidade=? AND registro_id=? LIMIT 1',
        [domain, id]
      );
      if (!queued) {
        // create+delete consolidou para nada: o registro nunca existiu na
        // nuvem, então o tombstone também pode desaparecer imediatamente.
        await tx.run('DELETE FROM local_documents WHERE dominio=? AND id=?', [domain, id]);
      }
    });
  }

  async function removeAll(domain) {
    const docs = await list(domain);
    for (const doc of docs) await remove(domain, doc.id);
  }

  async function putRemote(domain, item) {
    const {
      id, createdAt, updatedAt, deletedAt, deviceId, syncStatus: _syncStatus, localVersion,
      ...data
    } = item;
    const toIso = (value) => {
      if (typeof value === 'string') return value;
      if (typeof value?.toDate === 'function') return value.toDate().toISOString();
      return null;
    };
    const now = new Date().toISOString();
    await driver.run(
      `INSERT INTO local_documents
        (dominio,id,dados,created_at,updated_at,deleted_at,device_id,sync_status,local_version)
       VALUES (?,?,?,?,?,?,?,'synced',?)
       ON CONFLICT(dominio,id) DO UPDATE SET
        dados=excluded.dados,created_at=excluded.created_at,updated_at=excluded.updated_at,
        deleted_at=excluded.deleted_at,device_id=excluded.device_id,
        sync_status='synced',local_version=excluded.local_version`,
      [
        domain, id, JSON.stringify(data), toIso(createdAt) ?? now,
        toIso(updatedAt) ?? now, toIso(deletedAt), deviceId ?? 'remote',
        Number(localVersion) || 1,
      ]
    );
  }

  return { list, get, put, patch, remove, removeAll, putRemote };
}
