import {
  createUserDoc,
  updateUserDoc,
  deleteUserDoc,
  deleteAllUserDocs,
  listUserDocs,
  listUserDocsInRange,
  batchSetUserDocs,
} from '../../../firebase/firestore.js';
import { monthRangeBounds, shiftMonthKey, clampDayToMonth } from '../../../utils/monthKey.js';
import { slugify } from '../../../utils/slugify.js';

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
 * @property {string} [parcelamentoId]  shared by every installment of the same purchase
 * @property {number} [parcelaAtual]  1-based installment index
 * @property {number} [totalParcelas]
 */

/** Lists only the lançamentos due within the given 'YYYY-MM' month. */
export function listLancamentosByMonth(uid, monthKey) {
  const { gte, lte } = monthRangeBounds(monthKey);
  return listUserDocsInRange(uid, COLLECTION, { field: 'dataVencimento', gte, lte });
}

/** Lists lançamentos due within an arbitrary inclusive ['YYYY-MM-DD', 'YYYY-MM-DD'] range. */
export function listLancamentosByRange(uid, gte, lte) {
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

/** Wipes every lançamento for the user — recorrências/categorias are untouched. */
export function deleteAllLancamentos(uid) {
  return deleteAllUserDocs(uid, COLLECTION);
}

/** Quick status change from the list row, without opening the modal. */
export function setLancamentoStatus(uid, id, status) {
  return updateUserDoc(uid, COLLECTION, id, { status });
}

/**
 * Materializes every installment of a parcelamento up front (unlike
 * recorrências, which generate lazily month by month — a parcelamento has a
 * known end, so there's nothing to defer). Splits `valorTotal` evenly across
 * `numParcelas`, folding the rounding remainder into the last installment so
 * the sum always matches the original purchase value exactly.
 */
export async function createParcelamento(
  uid,
  { tipo, descricao, valorTotal, numParcelas, dataVencimento, categoriaId, observacoes }
) {
  const parcelamentoId = crypto.randomUUID();
  const [ano, mes, dia] = dataVencimento.split('-').map(Number);
  const mesInicial = `${ano}-${String(mes).padStart(2, '0')}`;

  const valorParcela = Math.round((valorTotal / numParcelas) * 100) / 100;
  const valorUltima = Math.round((valorTotal - valorParcela * (numParcelas - 1)) * 100) / 100;

  const itemsById = {};
  for (let i = 0; i < numParcelas; i++) {
    const monthKey = shiftMonthKey(mesInicial, i);
    const diaClamped = clampDayToMonth(monthKey, dia);
    itemsById[`${parcelamentoId}_${i + 1}`] = {
      tipo,
      descricao: `${descricao} (${i + 1}/${numParcelas})`,
      valor: i === numParcelas - 1 ? valorUltima : valorParcela,
      dataVencimento: `${monthKey}-${String(diaClamped).padStart(2, '0')}`,
      dataPagamento: null,
      status: 'pendente',
      observacoes: observacoes ?? null,
      categoriaId: categoriaId ?? null,
      parcelamentoId,
      parcelaAtual: i + 1,
      totalParcelas: numParcelas,
    };
  }

  await batchSetUserDocs(uid, COLLECTION, itemsById);
  return parcelamentoId;
}

/**
 * Deterministic id for an imported transaction — same date+descrição+valor
 * always maps to the same doc, so re-importing the same fatura is a no-op
 * for lines already present instead of creating duplicates.
 */
function importDocId(item) {
  const valorCentavos = Math.round(item.valor * 100);
  return `imp-${slugify(`${item.dataVencimento}-${item.descricao}-${valorCentavos}`)}`;
}

/**
 * Bulk-creates parsed statement/fatura transactions, skipping any whose
 * deterministic id already exists (see importDocId) — status is 'pago'/
 * 'recebido' since these are historical transactions, not upcoming bills.
 */
export async function importLancamentos(uid, itens) {
  const existentes = await listUserDocs(uid, COLLECTION);
  const idsExistentes = new Set(existentes.map((d) => d.id));

  const novos = {};
  for (const item of itens) {
    const id = importDocId(item);
    if (idsExistentes.has(id) || novos[id]) continue;
    novos[id] = {
      tipo: item.tipo,
      descricao: item.descricao,
      valor: item.valor,
      dataVencimento: item.dataVencimento,
      dataPagamento: item.dataVencimento,
      status: item.tipo === 'despesa' ? 'pago' : 'recebido',
      observacoes: null,
      categoriaId: null,
      ...(item.parcelaAtual
        ? {
            parcelamentoId: `imp-${slugify(item.descricao)}`,
            parcelaAtual: item.parcelaAtual,
            totalParcelas: item.totalParcelas,
          }
        : {}),
    };
  }

  const idsNovos = Object.keys(novos);
  if (idsNovos.length > 0) await batchSetUserDocs(uid, COLLECTION, novos);
  return { importados: idsNovos.length, duplicados: itens.length - idsNovos.length };
}
