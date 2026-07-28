import { batchUpdateUserDocsWithData, createUserDoc, updateUserDoc, deleteUserDoc, listUserDocs } from '../../../firebase/firestore.js';

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

export function calcularAporteAutomatico(meta, lancamentos, fechamento) {
  const automation = meta.aporteAutomatico;
  if (!automation?.tipo || automation.tipo === 'nenhum') return 0;
  if (automation.tipo === 'fixo') return Math.max(0, Number(automation.valor) || 0);
  if (automation.tipo === 'percentual_receita') {
    const income = lancamentos.filter((item) => item.tipo === 'receita' && ['recebido', 'pago'].includes(item.status))
      .reduce((sum, item) => sum + Number(item.valor || 0), 0);
    return income * Math.max(0, Number(automation.valor) || 0) / 100;
  }
  if (automation.tipo === 'saldo_fechamento' && fechamento?.status === 'fechado') {
    return Math.max(0, Number(fechamento.saldoReal) || 0);
  }
  return 0;
}

export async function processarAportesAutomaticos(uid, metas, lancamentos, fechamento, monthKey) {
  const updates = {};
  for (const meta of metas) {
    if (meta.ultimoAporteAutomaticoMes === monthKey) continue;
    const contribution = Math.round(calcularAporteAutomatico(meta, lancamentos, fechamento) * 100) / 100;
    if (contribution <= 0) continue;
    const current = Number(meta.valorAtual) || 0;
    const target = Number(meta.valorAlvo) || 0;
    updates[meta.id] = {
      valorAtual: target > 0 ? Math.min(target, current + contribution) : current + contribution,
      ultimoAporteAutomaticoMes: monthKey,
      ultimoAporteAutomaticoValor: contribution,
    };
  }
  if (Object.keys(updates).length) await batchUpdateUserDocsWithData(uid, COLLECTION, updates);
  return Object.keys(updates).length;
}

export function preverConclusaoMeta(meta, aporteMensal, monthKey) {
  const remaining = Math.max(0, Number(meta.valorAlvo || 0) - Number(meta.valorAtual || 0));
  if (remaining === 0) return monthKey;
  if (aporteMensal <= 0) return null;
  const months = Math.ceil(remaining / aporteMensal);
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + months, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
