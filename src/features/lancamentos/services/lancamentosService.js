import {
  createUserDoc,
  updateUserDoc,
  deleteUserDoc,
  deleteAllUserDocs,
  deleteUserDocsByIds,
  batchUpdateUserDocs,
  batchUpdateUserDocsWithData,
  listUserDocs,
  listUserDocsInRange,
  listUserDocsWhereEquals,
  batchSetUserDocs,
  hasAnyUserDoc,
} from '../../../firebase/firestore.js';
import { monthRangeBounds, shiftMonthKey, clampDayToMonth } from '../../../utils/monthKey.js';
import { slugify } from '../../../utils/slugify.js';
import { listRegrasCategorizacao } from '../../categorias/services/regrasCategorizacaoService.js';
import { aplicarRegras } from '../../categorias/utils/regrasCategorizacao.js';

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
export function listLancamentosByMonth(uid, monthKey, { source = 'default' } = {}) {
  const { gte, lte } = monthRangeBounds(monthKey);
  return listUserDocsInRange(uid, COLLECTION, { field: 'dataVencimento', gte, lte, source });
}

/** Lists every lançamento regardless of date — used by the Gestor Financeiro's analysis and import picker. */
export function listAllLancamentos(uid) {
  return listUserDocs(uid, COLLECTION);
}

/** True as soon as the user has created at least one lançamento — gates the Premium trial offer (Fase 7). */
export function hasAnyLancamento(uid) {
  return hasAnyUserDoc(uid, COLLECTION);
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

/** Re-categorizes every lançamento already generated from a given recorrência. */
export async function setCategoriaForRecorrencia(uid, recorrenciaId, categoriaId) {
  const gerados = await listUserDocsWhereEquals(uid, COLLECTION, 'origemRecorrenciaId', recorrenciaId);
  if (gerados.length === 0) return;
  await batchUpdateUserDocs(uid, COLLECTION, gerados.map((l) => l.id), { categoriaId });
}

/**
 * Updates recurrence instances already generated from `fromMonthKey` onward.
 * Each due date is recalculated because changing the template's due day needs
 * month-specific clamping (for example, day 31 becomes February 28/29).
 */
export async function updateGeneratedFromRecorrencia(uid, recorrenciaId, data, fromMonthKey) {
  const gerados = await listUserDocsWhereEquals(uid, COLLECTION, 'origemRecorrenciaId', recorrenciaId);
  const updatesById = {};

  for (const item of gerados) {
    if (!item.mesReferencia || item.mesReferencia < fromMonthKey) continue;
    const dia = clampDayToMonth(item.mesReferencia, data.diaVencimento);
    updatesById[item.id] = {
      descricao: data.descricao,
      valor: data.valor,
      dataVencimento: `${item.mesReferencia}-${String(dia).padStart(2, '0')}`,
      categoriaId: data.categoriaId ?? null,
      observacoes: data.observacoes ?? null,
    };
  }

  if (Object.keys(updatesById).length === 0) return 0;
  await batchUpdateUserDocsWithData(uid, COLLECTION, updatesById);
  return Object.keys(updatesById).length;
}

/**
 * Deletes lançamentos already generated from a recorrência — every instance,
 * or only `mesReferencia >= fromMonthKey` onward when the user picks "esta e
 * as próximas". Doesn't touch the `recorrencias` template itself; callers
 * that also want to stop future generation call `deleteRecorrencia` separately.
 */
export async function deleteGeneratedFromRecorrencia(uid, recorrenciaId, { fromMonthKey } = {}) {
  const gerados = await listUserDocsWhereEquals(uid, COLLECTION, 'origemRecorrenciaId', recorrenciaId);
  const alvo = fromMonthKey ? gerados.filter((l) => l.mesReferencia >= fromMonthKey) : gerados;
  if (alvo.length === 0) return;
  await deleteUserDocsByIds(uid, COLLECTION, alvo.map((l) => l.id));
}

/** Quick status change from the list row, without opening the modal. */
export function setLancamentoStatus(uid, id, status) {
  return updateUserDoc(uid, COLLECTION, id, { status });
}

/**
 * Pure builder for a parcelamento's installments (unlike recorrências, which
 * generate lazily month by month — a parcelamento has a known end, so there's
 * nothing to defer). Splits `valorTotal` evenly across `numParcelas`, folding
 * the rounding remainder into the last installment so the sum always matches
 * the original purchase value exactly. Extracted so the Gestor Financeiro's
 * own manual entry (a separate collection) can create a parcelamento the
 * same way without duplicating the split math.
 */
export function buildParcelamentoItems({ tipo, descricao, valorTotal, numParcelas, dataVencimento, categoriaId, observacoes }) {
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

  return { parcelamentoId, itemsById };
}

export async function createParcelamento(uid, dados) {
  const { parcelamentoId, itemsById } = buildParcelamentoItems(dados);
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
 * Pure doc-building step for a fatura/statement import — given the parsed
 * items and the set of doc ids that already exist in the target collection,
 * returns what still needs writing. Extracted so the Gestor Financeiro's own
 * import (a separate collection) can reuse the exact same parcela-expansion
 * rules instead of duplicating them.
 *
 * A fatura only shows the installment due *this* period, so when a line
 * carries parcela info (e.g. "2/10") the remaining future installments
 * (3/10 .. 10/10) are generated too, exactly like the manual "Parcelado"
 * flow. Every installment of the same purchase shares one
 * `${parcelamentoId}_${n}` id (derived from the description), so
 * re-importing this or a later fatura for the same purchase can't
 * duplicate what's already there.
 */
export function buildImportPayload(itens, idsExistentes) {
  const novos = {};
  let totalConsiderados = 0;

  for (const item of itens) {
    if (item.parcelaAtual && item.totalParcelas) {
      const parcelamentoId = `imp-${slugify(item.descricao)}`;
      const [ano, mes, dia] = item.dataVencimento.split('-').map(Number);
      const mesAtualKey = `${ano}-${String(mes).padStart(2, '0')}`;

      for (let n = item.parcelaAtual; n <= item.totalParcelas; n++) {
        totalConsiderados++;
        const id = `${parcelamentoId}_${n}`;
        if (idsExistentes.has(id) || novos[id]) continue;

        const monthKey = shiftMonthKey(mesAtualKey, n - item.parcelaAtual);
        const diaClamped = clampDayToMonth(monthKey, dia);
        const isAtual = n === item.parcelaAtual;

        novos[id] = {
          tipo: item.tipo,
          descricao: `${item.descricao} (${n}/${item.totalParcelas})`,
          valor: item.valor,
          dataVencimento: `${monthKey}-${String(diaClamped).padStart(2, '0')}`,
          dataPagamento: isAtual ? item.dataVencimento : null,
          status: isAtual ? (item.tipo === 'despesa' ? 'pago' : 'recebido') : 'pendente',
          observacoes: null,
          categoriaId: item.categoriaId ?? null,
          parcelamentoId,
          parcelaAtual: n,
          totalParcelas: item.totalParcelas,
        };
      }
    } else {
      totalConsiderados++;
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
        categoriaId: item.categoriaId ?? null,
      };
    }
  }

  return { novos, totalConsiderados };
}

/** Bulk-creates parsed statement/fatura transactions in the main Movimento — see `buildImportPayload`. */
export async function importLancamentos(uid, itens) {
  const [existentes, regras] = await Promise.all([
    listUserDocs(uid, COLLECTION),
    listRegrasCategorizacao(uid),
  ]);
  const idsExistentes = new Set(existentes.map((d) => d.id));

  const { novos, totalConsiderados } = buildImportPayload(aplicarRegras(itens, regras), idsExistentes);

  const idsNovos = Object.keys(novos);
  if (idsNovos.length > 0) await batchSetUserDocs(uid, COLLECTION, novos);
  return { importados: idsNovos.length, duplicados: totalConsiderados - idsNovos.length };
}

export function updateLancamentosEmMassa(uid, updatesById) {
  return batchUpdateUserDocsWithData(uid, COLLECTION, updatesById);
}

/** Deletes exactly the given lançamentos — used for "excluir deste período" bulk actions. */
export async function deleteLancamentosByIds(uid, ids) {
  await deleteUserDocsByIds(uid, COLLECTION, ids);
}
