import {
  createUserDoc,
  updateUserDoc,
  deleteUserDoc,
  deleteUserDocsByIds,
  getUserDoc,
  setUserDocMerged,
  listUserDocs,
  batchSetUserDocs,
  deleteAllUserDocs,
} from '../../../firebase/firestore.js';
import { buildImportPayload, buildParcelamentoItems } from '../../lancamentos/services/lancamentosService.js';

const COLLECTION = 'gestorLancamentos';
const CONFIG_COLLECTION = 'config';
const CONFIG_DOC = 'geral';

/**
 * Whether the Gestor Financeiro analyzes the Movimento's own lançamentos
 * directly (default) instead of a separate, manually-curated snapshot.
 */
export async function getGestorUsaMovimento(uid) {
  const doc = await getUserDoc(uid, CONFIG_COLLECTION, CONFIG_DOC);
  return doc?.gestorUsaMovimento ?? true;
}

export async function setGestorUsaMovimento(uid, value) {
  await setUserDocMerged(uid, CONFIG_COLLECTION, CONFIG_DOC, { gestorUsaMovimento: value });
}

export function listGestorLancamentos(uid) {
  return listUserDocs(uid, COLLECTION);
}

/** Manual entry, kept separate from the imports above — same shape as a Movimento lançamento. */
export function createGestorLancamento(uid, data) {
  return createUserDoc(uid, COLLECTION, data);
}

export function updateGestorLancamento(uid, id, data) {
  return updateUserDoc(uid, COLLECTION, id, data);
}

export function deleteGestorLancamento(uid, id) {
  return deleteUserDoc(uid, COLLECTION, id);
}

export function deleteGestorLancamentosByIds(uid, ids) {
  return deleteUserDocsByIds(uid, COLLECTION, ids);
}

/** Same installment-splitting rules as the Movimento's "Parcelado" flow, targeting the Gestor's own collection. */
export async function createParcelamentoGestor(uid, dados) {
  const { parcelamentoId, itemsById } = buildParcelamentoItems(dados);
  await batchSetUserDocs(uid, COLLECTION, itemsById);
  return parcelamentoId;
}

/**
 * Copies selected lançamentos from the Movimento into the Gestor's own
 * collection — a snapshot, not a live link, so later edits to the original
 * don't change what the Gestor already imported. Deterministic `mov-${id}`
 * ids make re-selecting the same lançamento a no-op instead of a duplicate.
 */
export async function importarDoMovimento(uid, lancamentosSelecionados) {
  const existentes = await listUserDocs(uid, COLLECTION);
  const idsExistentes = new Set(existentes.map((d) => d.id));

  const novos = {};
  for (const l of lancamentosSelecionados) {
    const id = `mov-${l.id}`;
    if (idsExistentes.has(id)) continue;
    // eslint-disable-next-line no-unused-vars
    const { id: _id, createdAt: _createdAt, ...resto } = l;
    novos[id] = resto;
  }

  const idsNovos = Object.keys(novos);
  if (idsNovos.length > 0) await batchSetUserDocs(uid, COLLECTION, novos);
  return { importados: idsNovos.length, duplicados: lancamentosSelecionados.length - idsNovos.length };
}

/** Same PDF-import parcela-expansion rules as the Movimento's import, targeting the Gestor's own collection. */
export async function importarFaturaParaGestor(uid, itens) {
  const existentes = await listUserDocs(uid, COLLECTION);
  const idsExistentes = new Set(existentes.map((d) => d.id));

  const { novos, totalConsiderados } = buildImportPayload(itens, idsExistentes);

  const idsNovos = Object.keys(novos);
  if (idsNovos.length > 0) await batchSetUserDocs(uid, COLLECTION, novos);
  return { importados: idsNovos.length, duplicados: totalConsiderados - idsNovos.length };
}

/**
 * Imports recorrência *templates* (not one dated instance, the standing
 * commitment itself) — no `dataVencimento`, marked `recorrenciaImportada`,
 * so the analysis counts it toward every month instead of just whichever
 * month happened to already have a generated lançamento for it.
 */
export async function importarRecorrencias(uid, recorrenciasSelecionadas) {
  const existentes = await listUserDocs(uid, COLLECTION);
  const idsExistentes = new Set(existentes.map((d) => d.id));

  const novos = {};
  for (const r of recorrenciasSelecionadas) {
    const id = `rec-${r.id}`;
    if (idsExistentes.has(id)) continue;
    novos[id] = {
      tipo: r.tipo,
      descricao: r.descricao,
      valor: r.valor,
      categoriaId: r.categoriaId ?? null,
      observacoes: r.observacoes ?? null,
      origemRecorrenciaId: r.id,
      recorrenciaImportada: true,
    };
  }

  const idsNovos = Object.keys(novos);
  if (idsNovos.length > 0) await batchSetUserDocs(uid, COLLECTION, novos);
  return { importados: idsNovos.length, duplicados: recorrenciasSelecionadas.length - idsNovos.length };
}

/** Wipes every lançamento imported into the Gestor Financeiro — the Movimento itself is untouched. */
export function deleteAllGestorLancamentos(uid) {
  return deleteAllUserDocs(uid, COLLECTION);
}
