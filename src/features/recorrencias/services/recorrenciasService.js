import {
  createUserDoc,
  updateUserDoc,
  deleteUserDoc,
  getUserDoc,
  setUserDoc,
  listUserDocs,
} from '../../../firebase/firestore.js';
import { clampDayToMonth, monthKeyFromTimestamp } from '../../../utils/monthKey.js';

const COLLECTION = 'recorrencias';

/**
 * @typedef {Object} Recorrencia
 * @property {'receita'|'despesa'} tipo
 * @property {string} descricao
 * @property {number} valor
 * @property {number} diaVencimento  1-31, clamped per month at generation time
 * @property {boolean} ativo
 * @property {string|null} observacoes
 */

export function listRecorrencias(uid) {
  return listUserDocs(uid, COLLECTION);
}

export function createRecorrencia(uid, data) {
  return createUserDoc(uid, COLLECTION, { ...data, ativo: true });
}

export function updateRecorrencia(uid, id, data) {
  return updateUserDoc(uid, COLLECTION, id, data);
}

export function deleteRecorrencia(uid, id) {
  return deleteUserDoc(uid, COLLECTION, id);
}

/**
 * Ensures every active recorrência has a generated `lancamentos` instance for
 * `monthKey`. Uses a deterministic doc id (`${recorrenciaId}_${monthKey}`) so
 * re-visiting the same month is a no-op instead of creating duplicates.
 * Doesn't touch instances already generated for other months, and never
 * backfills a month before the recorrência existed.
 */
export async function ensureGeneratedForMonth(uid, monthKey) {
  const recorrencias = await listRecorrencias(uid);

  for (const r of recorrencias.filter((item) => item.ativo)) {
    if (r.createdAt && monthKey < monthKeyFromTimestamp(r.createdAt)) continue;

    const dia = clampDayToMonth(monthKey, r.diaVencimento);
    const dataVencimento = `${monthKey}-${String(dia).padStart(2, '0')}`;
    const generatedId = `${r.id}_${monthKey}`;

    const existing = await getUserDoc(uid, 'lancamentos', generatedId);
    if (existing) continue;

    await setUserDoc(uid, 'lancamentos', generatedId, {
      tipo: r.tipo,
      descricao: r.descricao,
      valor: r.valor,
      dataVencimento,
      dataPagamento: null,
      status: 'pendente',
      observacoes: r.observacoes ?? null,
      origemRecorrenciaId: r.id,
      mesReferencia: monthKey,
    });
  }
}
