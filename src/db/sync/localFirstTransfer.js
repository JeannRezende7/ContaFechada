import { listUserDocs, setUserDoc, deleteUserDoc } from '../../firebase/firestore.js';
import { createLocalDocumentStore } from '../../repositories/sqlite/localDocumentStore.js';

export const LOCAL_FIRST_DOMAINS = [
  'lancamentos', 'categorias', 'regrasCategorizacao', 'recorrencias', 'metas',
  'valorLivre', 'planejamento', 'fechamentos', 'gestorLancamentos', 'configuracoes',
];

const REMOTE_COLLECTION = { configuracoes: 'config' };

function timestampMs(value) {
  if (typeof value === 'string') return new Date(value).getTime();
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  return 0;
}

export function createFirestoreTransferAdapter(uid) {
  return {
    list: (domain) => listUserDocs(uid, REMOTE_COLLECTION[domain] ?? domain),
    upsert: (domain, id, payload) => setUserDoc(uid, REMOTE_COLLECTION[domain] ?? domain, id, payload),
    remove: (domain, id) => deleteUserDoc(uid, REMOTE_COLLECTION[domain] ?? domain, id),
  };
}

export async function readLocalSnapshot(driver) {
  const rows = await driver.all(
    'SELECT * FROM local_documents ORDER BY dominio,id'
  );
  return rows.reduce((snapshot, row) => {
    snapshot[row.dominio] ??= [];
    snapshot[row.dominio].push({
      id: row.id,
      ...JSON.parse(row.dados),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      deviceId: row.device_id,
      syncStatus: row.sync_status,
      localVersion: row.local_version,
    });
    return snapshot;
  }, {});
}

export async function previewLocalFirstTransfer({ driver, remote, domains = LOCAL_FIRST_DOMAINS }) {
  const local = await readLocalSnapshot(driver);
  const preview = {};
  for (const domain of domains) {
    const localItems = (local[domain] ?? []).filter((item) => !item.deletedAt);
    const remoteItems = (await remote.list(domain)).filter((item) => !item.deletedAt);
    const localIds = new Set(localItems.map((item) => item.id));
    const remoteIds = new Set(remoteItems.map((item) => item.id));
    preview[domain] = {
      local: localItems.length,
      remoto: remoteItems.length,
      somenteLocal: localItems.filter((item) => !remoteIds.has(item.id)).length,
      somenteRemoto: remoteItems.filter((item) => !localIds.has(item.id)).length,
      emAmbos: localItems.filter((item) => remoteIds.has(item.id)).length,
    };
  }
  return preview;
}

export async function persistFirstSyncBackup(driver) {
  const snapshot = await readLocalSnapshot(driver);
  const reference = `firstSync:backup:${new Date().toISOString()}`;
  await driver.run('INSERT OR REPLACE INTO sync_state (chave,valor) VALUES (?,?)', [
    reference, JSON.stringify(snapshot),
  ]);
  return { persisted: true, reference };
}

export async function uploadLocalSnapshot({ driver, remote, domains = LOCAL_FIRST_DOMAINS }) {
  const snapshot = await readLocalSnapshot(driver);
  const summary = {};
  for (const domain of domains) {
    const items = snapshot[domain] ?? [];
    for (const item of items) {
      const { id, syncStatus: _syncStatus, ...payload } = item;
      if (item.deletedAt) await remote.remove(domain, id);
      else await remote.upsert(domain, id, payload);
    }
    summary[domain] = { count: items.filter((item) => !item.deletedAt).length };
  }
  return { summary };
}

export async function downloadRemoteSnapshot({ driver, remote, domains = LOCAL_FIRST_DOMAINS, replace = true }) {
  const store = createLocalDocumentStore(driver);
  const summary = {};
  if (replace) {
    await driver.transaction(async (tx) => {
      for (const domain of domains) {
        await tx.run('DELETE FROM local_documents WHERE dominio=?', [domain]);
        await tx.run('DELETE FROM sync_queue WHERE entidade=?', [domain]);
      }
    });
  }
  for (const domain of domains) {
    const items = await remote.list(domain);
    for (const item of items) await store.putRemote(domain, item);
    summary[domain] = { count: items.filter((item) => !item.deletedAt).length };
  }
  return { summary };
}

export async function mergeLocalAndRemoteSnapshots({ driver, remote, domains = LOCAL_FIRST_DOMAINS }) {
  const store = createLocalDocumentStore(driver);
  const local = await readLocalSnapshot(driver);
  const summary = {};
  for (const domain of domains) {
    const remoteItems = await remote.list(domain);
    const localById = new Map((local[domain] ?? []).map((item) => [item.id, item]));
    const remoteById = new Map(remoteItems.map((item) => [item.id, item]));
    const ids = new Set([...localById.keys(), ...remoteById.keys()]);
    let uploaded = 0;
    let downloaded = 0;
    for (const id of ids) {
      const localItem = localById.get(id);
      const remoteItem = remoteById.get(id);
      if (!localItem || (remoteItem && timestampMs(remoteItem.updatedAt) > timestampMs(localItem.updatedAt))) {
        await store.putRemote(domain, remoteItem);
        downloaded++;
      } else if (!remoteItem || timestampMs(localItem.updatedAt) >= timestampMs(remoteItem.updatedAt)) {
        const { id: _id, syncStatus: _syncStatus, ...payload } = localItem;
        if (localItem.deletedAt) await remote.remove(domain, id);
        else await remote.upsert(domain, id, payload);
        uploaded++;
      }
    }
    summary[domain] = { uploaded, downloaded };
  }
  return { summary };
}
