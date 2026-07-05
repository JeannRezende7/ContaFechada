import {
  createUserDoc,
  deleteUserDoc,
  deleteAllUserDocs,
  listUserDocs,
  batchSetUserDocs,
} from '../../../firebase/firestore.js';
import { DEFAULT_CATEGORIAS } from '../data/defaultCategorias.js';
import { slugify } from '../../../utils/slugify.js';

const COLLECTION = 'categorias';

/**
 * @typedef {Object} Categoria
 * @property {string} nome
 * @property {'receita'|'despesa'} tipo
 * @property {string} corKey  key into COLOR_MAP, never a raw Tailwind class
 * @property {string} icone  key into ICON_MAP
 * @property {boolean} padrao
 * @property {number} ordem
 */

export function listCategorias(uid) {
  return listUserDocs(uid, COLLECTION, { field: 'ordem', direction: 'asc' });
}

export function createCategoria(uid, data) {
  return createUserDoc(uid, COLLECTION, { ...data, padrao: false });
}

export function deleteCategoria(uid, id) {
  return deleteUserDoc(uid, COLLECTION, id);
}

/** Wipes every categoria — the next visit to Categorias/Lançamentos re-seeds the defaults. */
export function deleteAllCategorias(uid) {
  return deleteAllUserDocs(uid, COLLECTION);
}

/**
 * Seeds the default taxonomy once per user, using deterministic ids so a
 * retry (two tabs, a flaky connection) overwrites in place instead of
 * duplicating. Only runs when the collection is empty — if the user deletes
 * every category, the next load re-seeds the defaults.
 *
 * Returns the resulting list so callers don't need a second `listCategorias`
 * round trip right after — on every normal (already-seeded) load this makes
 * the check-and-use path a single query instead of two.
 */
export async function ensureDefaultCategorias(uid) {
  const existing = await listCategorias(uid);
  if (existing.length > 0) return existing;

  const itemsById = Object.fromEntries(
    DEFAULT_CATEGORIAS.map((c) => [slugify(`${c.tipo}-${c.nome}`), { ...c, padrao: true }])
  );
  await batchSetUserDocs(uid, COLLECTION, itemsById);
  return listCategorias(uid);
}
