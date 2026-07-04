import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config.js';
import { slugify } from '../../../utils/slug.js';
import { ROLES } from '../../../constants/roles.js';

/** Checks whether a given slug is already taken. */
export async function isSlugAvailable(slug) {
  const snap = await getDoc(doc(db, 'workspaces', slug));
  return !snap.exists();
}

/**
 * Generates a unique slug from a desired name, appending -2, -3, etc.
 * if the base slug is already taken (REQ-02).
 */
export async function generateUniqueSlug(name) {
  const base = slugify(name);
  let candidate = base;
  let attempt = 1;
  while (!(await isSlugAvailable(candidate))) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
  return candidate;
}

/** Creates a new workspace (tenant) with the creator as Administrador. */
export async function createWorkspace({ name, ownerId, ownerEmail }) {
  const slug = await generateUniqueSlug(name);
  await setDoc(doc(db, 'workspaces', slug), {
    name,
    slug,
    ownerId,
    members: {
      [ownerId]: { role: ROLES.ADMIN, email: ownerEmail },
    },
    createdAt: serverTimestamp(),
  });
  return slug;
}

/** Fetches a workspace document by its slug. Returns null if it doesn't exist. */
export async function getWorkspaceBySlug(slug) {
  const snap = await getDoc(doc(db, 'workspaces', slug));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Lists every workspace the given user belongs to, by querying the
 * `members.<uid>` map field. Used right after login to decide whether
 * to send the user to onboarding or straight into their workspace.
 */
export async function listMyWorkspaces(uid) {
  const q = query(
    collection(db, 'workspaces'),
    where(`members.${uid}.role`, 'in', ['admin', 'operador', 'visualizador'])
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
