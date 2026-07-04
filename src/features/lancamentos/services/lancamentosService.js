import {
  createUserDoc,
  updateUserDoc,
  deleteUserDoc,
  listUserDocsInRange,
} from '../../../firebase/firestore.js';
import { monthRangeBounds } from '../../../utils/monthKey.js';

const COLLECTION = 'lancamentos';

/**
 * @typedef {Object} Lancamento
 * @property {'receita'|'despesa'} tipo
 * @property {string} descricao
 * @property {number} valor
 * @property {string} dataVencimento  ISO date string 'YYYY-MM-DD'
 * @property {string|null} dataPagamento
 * @property {'pendente'|'pago'|'recebido'|'atrasado'|'agendado'} status
 * @property {string|null} observacoes
 * @property {string|null} categoriaId
 * @property {string|null} origemRecorrenciaId  set when auto-generated from a recorrência
 * @property {string} [mesReferencia]  'YYYY-MM', set when auto-generated
 */

/** Lists only the lançamentos due within the given 'YYYY-MM' month. */
export function listLancamentosByMonth(uid, monthKey) {
  const { gte, lte } = monthRangeBounds(monthKey);
  return listUserDocsInRange(uid, COLLECTION, { field: 'dataVencimento', gte, lte });
}

export function createLancamento(uid, data) {
  return createUserDoc(uid, COLLECTION, data);
}

export function updateLancamento(uid, id, data) {
  return updateUserDoc(uid, COLLECTION, id, data);
}

export function deleteLancamento(uid, id) {
  return deleteUserDoc(uid, COLLECTION, id);
}

/** Quick status change from the list row, without opening the modal. */
export function setLancamentoStatus(uid, id, status) {
  return updateUserDoc(uid, COLLECTION, id, { status });
}
