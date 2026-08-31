import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config.js';
import { getDeviceId } from '../utils/deviceId.js';

/**
 * Fase 2 do roadmap local-first: metadados de sincronização gravados em
 * todo registro, além dos campos financeiros/de negócio de cada domínio.
 * `syncStatus` fica 'synced' porque hoje toda escrita já vai direto pro
 * Firestore (não existe fila local ainda — essa é a Fase 6); quando a fila
 * existir, o caminho de escrita local passa a gravar 'pending'/'syncing'
 * antes de chegar aqui. `deletedAt` só é inicializado como `null` — a
 * exclusão lógica em si (Fase 6) ainda não está implementada, os deletes
 * continuam apagando o documento de verdade.
 */
function newRecordMetadata() {
  return {
    updatedAt: serverTimestamp(),
    deletedAt: null,
    deviceId: getDeviceId(),
    syncStatus: 'synced',
    localVersion: 1,
  };
}

function updatedRecordMetadata() {
  return {
    updatedAt: serverTimestamp(),
    syncStatus: 'synced',
    localVersion: increment(1),
  };
}

const QUERY_CACHE_TTL_MS = 5 * 60 * 1000;
const queryMemoryCache = new Map();
const queryInflight = new Map();
const collectionRevisions = new Map();

function collectionKey(uid, subcollection) {
  return `${uid}:${subcollection}`;
}

function queryCacheKey(uid, subcollection, queryType, options = {}) {
  return `${collectionKey(uid, subcollection)}:${queryType}:${JSON.stringify(options)}`;
}

function readMemoryCache(key) {
  const entry = queryMemoryCache.get(key);
  if (!entry || Date.now() - entry.savedAt > QUERY_CACHE_TTL_MS) {
    queryMemoryCache.delete(key);
    return null;
  }
  return entry.value;
}

async function cachedQuery(key, loader, { bypass = false } = {}) {
  if (!bypass) {
    const cached = readMemoryCache(key);
    if (cached !== null) return cached;
    if (queryInflight.has(key)) return queryInflight.get(key);
  }
  const request = loader()
    .then((value) => {
      queryMemoryCache.set(key, { value, savedAt: Date.now() });
      return value;
    })
    .finally(() => queryInflight.delete(key));
  queryInflight.set(key, request);
  return request;
}

function invalidateCollection(uid, subcollection) {
  const prefix = `${collectionKey(uid, subcollection)}:`;
  for (const key of queryMemoryCache.keys()) {
    if (key.startsWith(prefix)) queryMemoryCache.delete(key);
  }
  collectionRevisions.set(
    collectionKey(uid, subcollection),
    (collectionRevisions.get(collectionKey(uid, subcollection)) || 0) + 1
  );
}

function visibleDocument(docSnapshot) {
  const item = { id: docSnapshot.id, ...docSnapshot.data() };
  return item.deletedAt ? null : item;
}

function visibleDocuments(snapshot) {
  return snapshot.docs.map(visibleDocument).filter(Boolean);
}

export function getCollectionRevision(uid, subcollection) {
  return collectionRevisions.get(collectionKey(uid, subcollection)) || 0;
}

export function clearFirestoreMemoryCache(uid) {
  if (!uid) {
    queryMemoryCache.clear();
    queryInflight.clear();
    collectionRevisions.clear();
    return;
  }
  const prefix = `${uid}:`;
  for (const key of queryMemoryCache.keys()) {
    if (key.startsWith(prefix)) queryMemoryCache.delete(key);
  }
  for (const key of collectionRevisions.keys()) {
    if (key.startsWith(prefix)) collectionRevisions.delete(key);
  }
}

function getDocsFromSource(queryRef, source = 'default') {
  if (source === 'cache') return getDocsFromCache(queryRef);
  if (source === 'server') return getDocsFromServer(queryRef);
  return getDocs(queryRef);
}

/**
 * Every resource lives under /users/{uid}/{subcollection} — each Firebase
 * Auth user owns their own data directly (no shared/multi-user workspace).
 */
export function userCollection(uid, subcollection) {
  return collection(db, 'users', uid, subcollection);
}

export function userDoc(uid, subcollection, docId) {
  return doc(db, 'users', uid, subcollection, docId);
}

/**
 * Id gerado no cliente (UUID v4) em vez do id automático do Firestore — Fase
 * 2 do roadmap local-first: o mesmo esquema de id precisa funcionar para um
 * registro criado offline/sem conta (Fase 3/4), então o id não pode depender
 * de uma resposta do servidor. Colisão entre um id gerado localmente e um já
 * existente na nuvem é praticamente impossível com UUID v4.
 */
export async function createUserDoc(uid, subcollection, data) {
  const id = crypto.randomUUID();
  await setDoc(userDoc(uid, subcollection, id), {
    ...data,
    createdAt: serverTimestamp(),
    ...newRecordMetadata(),
  });
  invalidateCollection(uid, subcollection);
  return id;
}

/** Writes with a caller-chosen (deterministic) id — used for idempotent recurring-entry generation. */
export async function setUserDoc(uid, subcollection, docId, data) {
  await setDoc(userDoc(uid, subcollection, docId), {
    ...data,
    createdAt: serverTimestamp(),
    ...newRecordMetadata(),
  });
  invalidateCollection(uid, subcollection);
}

/**
 * Like `setUserDoc`, but merges instead of replacing — for a doc that holds
 * several independent settings (e.g. `config/geral`), a plain `setDoc` would
 * silently wipe out every other field whenever just one setting is saved.
 */
export async function setUserDocMerged(uid, subcollection, docId, data) {
  await setDoc(
    userDoc(uid, subcollection, docId),
    { ...data, deviceId: getDeviceId(), ...updatedRecordMetadata() },
    { merge: true }
  );
  invalidateCollection(uid, subcollection);
}

/**
 * Creates multiple docs with caller-chosen ids — used for idempotent
 * default-data seeding and bulk imports. Chunked to stay under Firestore's
 * 500-writes-per-batch limit (a large fatura import with many parcelamentos
 * can easily produce more writes than that).
 */
export async function batchSetUserDocs(uid, subcollection, itemsById) {
  const entries = Object.entries(itemsById);
  const CHUNK = 400;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const [docId, data] of entries.slice(i, i + CHUNK)) {
      batch.set(userDoc(uid, subcollection, docId), {
        ...data,
        createdAt: serverTimestamp(),
        ...newRecordMetadata(),
      });
    }
    await batch.commit();
  }
  invalidateCollection(uid, subcollection);
}

export async function updateUserDoc(uid, subcollection, docId, data) {
  await updateDoc(userDoc(uid, subcollection, docId), { ...data, ...updatedRecordMetadata() });
  invalidateCollection(uid, subcollection);
}

export async function deleteUserDoc(uid, subcollection, docId) {
  return tombstoneUserDoc(uid, subcollection, docId);
}

export async function deleteUserDocPermanently(uid, subcollection, docId) {
  await deleteDoc(userDoc(uid, subcollection, docId));
  invalidateCollection(uid, subcollection);
}

/**
 * Synchronised removals stay visible long enough for every device to receive
 * them through the incremental `updatedAt` query. Permanent cleanup is a
 * separate retention concern.
 */
export async function tombstoneUserDoc(uid, subcollection, docId) {
  await setDoc(
    userDoc(uid, subcollection, docId),
    {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deviceId: getDeviceId(),
      syncStatus: 'synced',
      localVersion: increment(1),
    },
    { merge: true }
  );
  invalidateCollection(uid, subcollection);
}

/** Deletes the given doc ids — chunked to stay under Firestore's 500-writes-per-batch limit. */
export async function deleteUserDocsByIds(uid, subcollection, ids) {
  const CHUNK = 400;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + CHUNK)) {
      batch.set(
        userDoc(uid, subcollection, id),
        {
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          deviceId: getDeviceId(),
          syncStatus: 'synced',
          localVersion: increment(1),
        },
        { merge: true }
      );
    }
    await batch.commit();
  }
  if (ids.length > 0) invalidateCollection(uid, subcollection);
}

/** Deletes every doc in a subcollection. */
export async function deleteAllUserDocs(uid, subcollection) {
  const snap = await getDocs(userCollection(uid, subcollection));
  const CHUNK = 400;
  for (let i = 0; i < snap.docs.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const item of snap.docs.slice(i, i + CHUNK)) batch.delete(item.ref);
    await batch.commit();
  }
  invalidateCollection(uid, subcollection);
}

/** Applies the same partial update to multiple docs — chunked like batchSetUserDocs. */
export async function batchUpdateUserDocs(uid, subcollection, ids, data) {
  const CHUNK = 400;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + CHUNK)) {
      batch.update(userDoc(uid, subcollection, id), { ...data, ...updatedRecordMetadata() });
    }
    await batch.commit();
  }
  if (ids.length > 0) invalidateCollection(uid, subcollection);
}

/** Applies different partial data to each document, chunked under Firestore's batch limit. */
export async function batchUpdateUserDocsWithData(uid, subcollection, updatesById) {
  const entries = Object.entries(updatesById);
  const CHUNK = 400;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const [id, data] of entries.slice(i, i + CHUNK)) {
      batch.update(userDoc(uid, subcollection, id), { ...data, ...updatedRecordMetadata() });
    }
    await batch.commit();
  }
  if (entries.length > 0) invalidateCollection(uid, subcollection);
}

export async function getUserDoc(uid, subcollection, docId) {
  const key = queryCacheKey(uid, subcollection, 'doc', { docId });
  return cachedQuery(key, async () => {
    const snap = await getDoc(userDoc(uid, subcollection, docId));
    return snap.exists() ? visibleDocument(snap) : null;
  }, { bypass: subcollection === 'private' });
}

export async function listUserDocs(uid, subcollection, { field, direction = 'desc', source = 'default' } = {}) {
  const col = userCollection(uid, subcollection);
  const q = field ? query(col, orderBy(field, direction)) : col;
  const key = queryCacheKey(uid, subcollection, 'list', { field: field || '', direction });
  return cachedQuery(key, async () => {
    const snap = await getDocsFromSource(q, source);
    return visibleDocuments(snap);
  }, { bypass: source !== 'default' });
}

/** Range query on a single field (e.g. 'YYYY-MM-DD' date strings for a given month). */
export async function listUserDocsInRange(
  uid,
  subcollection,
  { field, gte, lte, direction = 'asc', source = 'default' }
) {
  const col = userCollection(uid, subcollection);
  const q = query(col, where(field, '>=', gte), where(field, '<=', lte), orderBy(field, direction));
  const key = queryCacheKey(uid, subcollection, 'range', { field, gte, lte, direction });
  return cachedQuery(key, async () => {
    const snap = await getDocsFromSource(q, source);
    return visibleDocuments(snap);
  }, { bypass: source !== 'default' });
}

/** Equality query on a single field (e.g. every lançamento generated from one recorrência). */
export async function listUserDocsWhereEquals(uid, subcollection, field, value) {
  const col = userCollection(uid, subcollection);
  const q = query(col, where(field, '==', value));
  const key = queryCacheKey(uid, subcollection, 'equals', { field, value });
  return cachedQuery(key, async () => {
    const snap = await getDocs(q);
    return visibleDocuments(snap);
  });
}

/**
 * Fase 7 (download de alterações remotas): registros com `updatedAt` maior
 * ou igual a `sinceIso`, do mais antigo pro mais novo — a base do "baixar
 * só o que mudou desde o último cursor". `updatedAt` é gravado como
 * Timestamp do Firestore (Fase 2), então a comparação também precisa ser
 * com um Timestamp, não uma string.
 */
export async function listUserDocsUpdatedSince(uid, subcollection, sinceIso, { source = 'default' } = {}) {
  const col = userCollection(uid, subcollection);
  const sinceTimestamp = Timestamp.fromDate(new Date(sinceIso));
  const q = query(col, where('updatedAt', '>', sinceTimestamp), orderBy('updatedAt', 'asc'));
  const key = queryCacheKey(uid, subcollection, 'updatedSince', { sinceIso });
  return cachedQuery(key, async () => {
    const snap = await getDocsFromSource(q, source);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }, { bypass: source !== 'default' });
}

/** Cheapest possible existence check — fetches at most 1 doc instead of the whole subcollection. */
export async function hasAnyUserDoc(uid, subcollection) {
  const items = await listUserDocs(uid, subcollection);
  return items.length > 0;
}

export { where, query, orderBy };
