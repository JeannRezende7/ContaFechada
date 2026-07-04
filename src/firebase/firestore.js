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
 * Atomically creates multiple docs with caller-chosen ids — used for
 * idempotent default-data seeding (a partial loop of individual writes could
 * leave a collection non-empty but incomplete, permanently skipping re-seed).
 */
export async function batchSetUserDocs(uid, subcollection, itemsById) {
  const batch = writeBatch(db);
  for (const [docId, data] of Object.entries(itemsById)) {
    batch.set(userDoc(uid, subcollection, docId), { ...data, createdAt: serverTimestamp() });
  }
  await batch.commit();
}

export async function updateUserDoc(uid, subcollection, docId, data) {
  await updateDoc(userDoc(uid, subcollection, docId), data);
}

export async function deleteUserDoc(uid, subcollection, docId) {
  await deleteDoc(userDoc(uid, subcollection, docId));
}

/** Deletes every doc in a subcollection — chunked to stay under Firestore's 500-writes-per-batch limit. */
export async function deleteAllUserDocs(uid, subcollection) {
  const snap = await getDocs(userCollection(uid, subcollection));
  const ids = snap.docs.map((d) => d.id);
  const CHUNK = 400;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + CHUNK)) {
      batch.delete(userDoc(uid, subcollection, id));
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

export { where, query, orderBy };
