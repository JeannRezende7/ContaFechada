import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';

/**
 * Every tenant-scoped resource lives under /workspaces/{slug}/{subcollection}.
 * This keeps REQ-02 (isolamento de dados por workspace) enforced at the data
 * layer instead of relying on query filters everywhere they're used.
 */
export function tenantCollection(slug, subcollection) {
  return collection(db, 'workspaces', slug, subcollection);
}

export function tenantDoc(slug, subcollection, docId) {
  return doc(db, 'workspaces', slug, subcollection, docId);
}

export async function createTenantDoc(slug, subcollection, data) {
  const ref = await addDoc(tenantCollection(slug, subcollection), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTenantDoc(slug, subcollection, docId, data) {
  await updateDoc(tenantDoc(slug, subcollection, docId), data);
}

export async function deleteTenantDoc(slug, subcollection, docId) {
  await deleteDoc(tenantDoc(slug, subcollection, docId));
}

export async function getTenantDoc(slug, subcollection, docId) {
  const snap = await getDoc(tenantDoc(slug, subcollection, docId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listTenantDocs(slug, subcollection, { field, direction = 'desc' } = {}) {
  const col = tenantCollection(slug, subcollection);
  const q = field ? query(col, orderBy(field, direction)) : col;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export { where, query, orderBy };
