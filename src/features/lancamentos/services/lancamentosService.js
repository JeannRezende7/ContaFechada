import {
  createTenantDoc,
  updateTenantDoc,
  deleteTenantDoc,
  listTenantDocs,
} from '../../../firebase/firestore.js';

const COLLECTION = 'lancamentos';

/**
 * @typedef {Object} Lancamento
 * @property {'receita'|'despesa'} tipo
 * @property {string} descricao
 * @property {number} valor
 * @property {string} dataVencimento  ISO date string
 * @property {string|null} dataPagamento
 * @property {string|null} categoriaId
 * @property {string|null} contaBancariaId
 * @property {'pendente'|'pago'|'recebido'|'atrasado'|'agendado'} status
 * @property {string|null} observacoes
 */

export function listLancamentos(slug) {
  return listTenantDocs(slug, COLLECTION, { field: 'dataVencimento', direction: 'asc' });
}

export function createLancamento(slug, data) {
  return createTenantDoc(slug, COLLECTION, data);
}

export function updateLancamento(slug, id, data) {
  return updateTenantDoc(slug, COLLECTION, id, data);
}

export function deleteLancamento(slug, id) {
  return deleteTenantDoc(slug, COLLECTION, id);
}

/** Quick status change from the list row, without opening the modal (REQ status visual). */
export function setLancamentoStatus(slug, id, status) {
  return updateTenantDoc(slug, COLLECTION, id, { status });
}
