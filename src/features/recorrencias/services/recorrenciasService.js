import {
  createUserDoc,
  updateUserDoc,
  deleteUserDoc,
  listUserDocs,
  listUserDocsWhereEquals,
  batchSetUserDocs,
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
 *
 * Checks which instances already exist with a single query (`mesReferencia
 * == monthKey`) instead of one round trip per recorrência — with several
 * recorrências active, a per-item `getUserDoc` loop turned every page load
 * into a chain of sequential network round trips.
 *
 * Accepts an optional pre-fetched `recorrencias` list so a caller checking
 * several months in the same pass (or that already needs the list itself)
 * doesn't pay for a repeat `listRecorrencias` round trip per month.
 */
export async function ensureGeneratedForMonth(uid, monthKey, recorrenciasPreFetched) {
  const recorrencias = recorrenciasPreFetched ?? (await listRecorrencias(uid));
  const ativas = recorrencias.filter(
    (r) => r.ativo && (!r.createdAt || monthKey >= monthKeyFromTimestamp(r.createdAt))
  );
  if (ativas.length === 0) return;

  const jaGerados = await listUserDocsWhereEquals(uid, 'lancamentos', 'mesReferencia', monthKey);
  const idsGerados = new Set(jaGerados.map((d) => d.id));

  const novos = {};
  for (const r of ativas) {
    const generatedId = `${r.id}_${monthKey}`;
    if (idsGerados.has(generatedId)) continue;

    const dia = clampDayToMonth(monthKey, r.diaVencimento);
    novos[generatedId] = {
      tipo: r.tipo,
      descricao: r.descricao,
      valor: r.valor,
      dataVencimento: `${monthKey}-${String(dia).padStart(2, '0')}`,
      dataPagamento: null,
      status: 'pendente',
      observacoes: r.observacoes ?? null,
      categoriaId: r.categoriaId ?? null,
      origemRecorrenciaId: r.id,
      mesReferencia: monthKey,
    };
  }

  if (Object.keys(novos).length > 0) await batchSetUserDocs(uid, 'lancamentos', novos);
}
