import {
  createUserDoc,
  deleteUserDoc,
  listUserDocs,
  batchSetUserDocs,
} from '../../../firebase/firestore.js';
import { DEFAULT_CATEGORIAS } from '../data/defaultCategorias.js';

const COLLECTION = 'categorias';

/**
 * @typedef {Object} Categoria
 * @property {string} nome
 * @property {'receita'|'despesa'} tipo
 * @property {string} grupo
 * @property {string} corKey  key into COLOR_MAP, never a raw Tailwind class
 * @property {boolean} padrao
 * @property {number} ordem
 */

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function listCategorias(uid) {
  return listUserDocs(uid, COLLECTION, { field: 'ordem', direction: 'asc' });
}

export function createCategoria(uid, data) {
  return createUserDoc(uid, COLLECTION, { ...data, padrao: false });
}

export function deleteCategoria(uid, id) {
  return deleteUserDoc(uid, COLLECTION, id);
}

/**
 * Seeds the default taxonomy once per user, using deterministic ids so a
 * retry (two tabs, a flaky connection) overwrites in place instead of
 * duplicating. Only runs when the collection is empty — if the user deletes
 * every category, the next load re-seeds the defaults.
 */
export async function ensureDefaultCategorias(uid) {
  const existing = await listCategorias(uid);
  if (existing.length > 0) return;

  const itemsById = Object.fromEntries(
    DEFAULT_CATEGORIAS.map((c) => [slugify(`${c.grupo}-${c.nome}`), { ...c, padrao: true }])
  );
  await batchSetUserDocs(uid, COLLECTION, itemsById);
}
