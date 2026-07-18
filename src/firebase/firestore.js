import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config.js';

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

export async function createUserDoc(uid, subcollection, data) {
  const ref = await addDoc(userCollection(uid, subcollection), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Writes with a caller-chosen (deterministic) id — used for idempotent recurring-entry generation. */
export async function setUserDoc(uid, subcollection, docId, data) {
  await setDoc(userDoc(uid, subcollection, docId), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

/**
 * Like `setUserDoc`, but merges instead of replacing — for a doc that holds
 * several independent settings (e.g. `config/geral`), a plain `setDoc` would
 * silently wipe out every other field whenever just one setting is saved.
 */
export async function setUserDocMerged(uid, subcollection, docId, data) {
  await setDoc(userDoc(uid, subcollection, docId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
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
      batch.set(userDoc(uid, subcollection, docId), { ...data, createdAt: serverTimestamp() });
    }
    await batch.commit();
  }
}

export async function updateUserDoc(uid, subcollection, docId, data) {
  await updateDoc(userDoc(uid, subcollection, docId), data);
}

export async function deleteUserDoc(uid, subcollection, docId) {
  await deleteDoc(userDoc(uid, subcollection, docId));
}

/** Deletes the given doc ids — chunked to stay under Firestore's 500-writes-per-batch limit. */
export async function deleteUserDocsByIds(uid, subcollection, ids) {
  const CHUNK = 400;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + CHUNK)) {
      batch.delete(userDoc(uid, subcollection, id));
    }
    await batch.commit();
  }
}

/** Deletes every doc in a subcollection. */
export async function deleteAllUserDocs(uid, subcollection) {
  const snap = await getDocs(userCollection(uid, subcollection));
  await deleteUserDocsByIds(uid, subcollection, snap.docs.map((d) => d.id));
}

/** Applies the same partial update to multiple docs — chunked like batchSetUserDocs. */
export async function batchUpdateUserDocs(uid, subcollection, ids, data) {
  const CHUNK = 400;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + CHUNK)) {
      batch.update(userDoc(uid, subcollection, id), data);
    }
    await batch.commit();
  }
}

export async function getUserDoc(uid, subcollection, docId) {
  const snap = await getDoc(userDoc(uid, subcollection, docId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listUserDocs(uid, subcollection, { field, direction = 'desc' } = {}) {
  const col = userCollection(uid, subcollection);
  const q = field ? query(col, orderBy(field, direction)) : col;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Range query on a single field (e.g. 'YYYY-MM-DD' date strings for a given month). */
export async function listUserDocsInRange(uid, subcollection, { field, gte, lte, direction = 'asc' }) {
  const col = userCollection(uid, subcollection);
  const q = query(col, where(field, '>=', gte), where(field, '<=', lte), orderBy(field, direction));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Equality query on a single field (e.g. every lançamento generated from one recorrência). */
export async function listUserDocsWhereEquals(uid, subcollection, field, value) {
  const col = userCollection(uid, subcollection);
  const q = query(col, where(field, '==', value));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Cheapest possible existence check — fetches at most 1 doc instead of the whole subcollection. */
export async function hasAnyUserDoc(uid, subcollection) {
  const snap = await getDocs(query(userCollection(uid, subcollection), limit(1)));
  return !snap.empty;
}

export { where, query, orderBy };
