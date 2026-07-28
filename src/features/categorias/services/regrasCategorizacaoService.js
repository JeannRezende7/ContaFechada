import {
  batchUpdateUserDocsWithData,
  createUserDoc,
  deleteUserDoc,
  listUserDocs,
  updateUserDoc,
} from '../../../firebase/firestore.js';
import { aplicarRegras } from '../utils/regrasCategorizacao.js';

const COLLECTION = 'regrasCategorizacao';

export function listRegrasCategorizacao(uid) {
  return listUserDocs(uid, COLLECTION, { field: 'prioridade', direction: 'desc' });
}

export function createRegraCategorizacao(uid, data) {
  return createUserDoc(uid, COLLECTION, { ...data, ativa: true });
}

export function updateRegraCategorizacao(uid, id, data) {
  return updateUserDoc(uid, COLLECTION, id, data);
}

export function deleteRegraCategorizacao(uid, id) {
  return deleteUserDoc(uid, COLLECTION, id);
}

export async function aplicarRegrasAosAntigos(uid, regras, lancamentos, sobrescrever = false) {
  const categorized = aplicarRegras(lancamentos, regras, { sobrescrever });
  const updates = {};
  categorized.forEach((item, index) => {
    const original = lancamentos[index];
    if (item.categoriaId !== original.categoriaId) {
      updates[item.id] = { categoriaId: item.categoriaId, regraCategorizacaoId: item.regraCategorizacaoId };
    }
  });
  if (Object.keys(updates).length) await batchUpdateUserDocsWithData(uid, 'lancamentos', updates);
  return Object.keys(updates).length;
}
