import { createUserDoc, updateUserDoc, deleteUserDoc, listUserDocs } from '../../../firebase/firestore.js';

const COLLECTION = 'metas';

/**
 * @typedef {Object} Meta
 * @property {string} nome
 * @property {number} valorAlvo
 * @property {number} valorAtual
 * @property {string} corKey
 */

export function listMetas(uid) {
  return listUserDocs(uid, COLLECTION);
}

export function createMeta(uid, data) {
  return createUserDoc(uid, COLLECTION, { valorAtual: 0, ...data });
}

export function updateMeta(uid, id, data) {
  return updateUserDoc(uid, COLLECTION, id, data);
}

export function deleteMeta(uid, id) {
  return deleteUserDoc(uid, COLLECTION, id);
}

/** Adds (or subtracts, if negative) an amount to a meta's current progress. */
export function aportarNaMeta(uid, meta, valor) {
  const novoValor = Math.max(0, (Number(meta.valorAtual) || 0) + valor);
  return updateUserDoc(uid, COLLECTION, meta.id, { valorAtual: novoValor });
}
