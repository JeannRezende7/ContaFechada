import { listLancamentosByMonth } from '../../lancamentos/services/lancamentosService.js';
import { listRecorrencias, ensureGeneratedForMonths } from '../../recorrencias/services/recorrenciasService.js';
import { shiftMonthKey, getCurrentMonthKey } from '../../../utils/monthKey.js';
import { getUserDoc, setUserDocMerged, getCollectionRevision } from '../../../firebase/firestore.js';
import { getStatusEfetivo } from '../../lancamentos/utils/statusLancamento.js';

const dashboardMemory = new Map();

function dashboardCacheKey(uid, monthKey) {
  return `${uid}:${monthKey}`;
}

export function getDashboardMemoryCache(uid, monthKey) {
  const entry = dashboardMemory.get(dashboardCacheKey(uid, monthKey)) ?? null;
  if (!entry) return null;
  const sameRevision = entry.lancamentosRevision === getCollectionRevision(uid, 'lancamentos');
  const fresh = Date.now() - entry.cachedAt < 5 * 60 * 1000;
  return sameRevision && fresh ? entry.data : null;
}

export function setDashboardMemoryCache(uid, monthKey, data) {
  dashboardMemory.set(dashboardCacheKey(uid, monthKey), {
    data,
    cachedAt: Date.now(),
    lancamentosRevision: getCollectionRevision(uid, 'lancamentos'),
  });
}

export function clearDashboardMemoryCache(uid) {
  if (!uid) {
    dashboardMemory.clear();
    return;
  }
  const prefix = `${uid}:`;
  for (const key of dashboardMemory.keys()) {
    if (key.startsWith(prefix)) dashboardMemory.delete(key);
  }
}

function computeIndicators(lancamentos, monthKey) {
  let saldoMes = 0;
  let totalAPagar = 0;
  let totalAReceber = 0;
  let contasAtrasadas = 0;
  let despesaMes = 0;
  let maiorGasto = null;
  let ultimoLancamento = null;
  let proximoVencimento = null;
  const hoje = getCurrentMonthKey() === monthKey ? new Date().toISOString().slice(0, 10) : null;

  for (const item of lancamentos) {
    const valor = Number(item.valor) || 0;
    const isReceita = item.tipo === 'receita';

    saldoMes += isReceita ? valor : -valor;
    if (!isReceita) {
      despesaMes += valor;
      if (!maiorGasto || valor > (Number(maiorGasto.valor) || 0)) maiorGasto = item;
    }

    const isPendente = item.status !== 'pago' && item.status !== 'recebido';
    if (isPendente) {
      if (isReceita) totalAReceber += valor;
      else totalAPagar += valor;
    }

    if (getStatusEfetivo(item) === 'atrasado') contasAtrasadas += 1;

    if (!ultimoLancamento || item.dataVencimento > ultimoLancamento.dataVencimento) {
      ultimoLancamento = item;
    }

    if (isPendente && (!hoje || item.dataVencimento >= hoje)) {
      if (!proximoVencimento || item.dataVencimento < proximoVencimento.dataVencimento) {
        proximoVencimento = item;
      }
    }
  }

  return {
    saldoMes,
    totalAPagar,
    totalAReceber,
    contasAtrasadas,
    despesaMes,
    maiorGasto,
    ultimoLancamento,
    proximoVencimento,
    economizou: saldoMes > 0,
  };
}

/** Soma de despesas do mês agrupada por categoria — usada nos insights automáticos. */
export function agruparDespesaPorCategoria(lancamentos) {
  const porCategoria = {};
  for (const item of lancamentos) {
    if (item.tipo !== 'despesa') continue;
    const valor = Number(item.valor) || 0;
    const chave = item.categoriaId ?? '_sem_categoria';
    porCategoria[chave] = (porCategoria[chave] ?? 0) + valor;
  }
  return porCategoria;
}

function computeComparacao(lancamentosAtual, lancamentosAnterior) {
  const porCategoriaAtual = agruparDespesaPorCategoria(lancamentosAtual);
  const despesaAtual = Object.values(porCategoriaAtual).reduce((a, b) => a + b, 0);

  const porCategoriaAnterior = agruparDespesaPorCategoria(lancamentosAnterior);
  const despesaAnterior = Object.values(porCategoriaAnterior).reduce((a, b) => a + b, 0);

  const percentual = despesaAnterior > 0 ? ((despesaAtual - despesaAnterior) / despesaAnterior) * 100 : null;

  return { despesaAtual, despesaAnterior, percentual, porCategoriaAtual, porCategoriaAnterior };
}

async function loadDashboardMonths(uid, monthKey, source = 'default') {
  const anterior = shiftMonthKey(monthKey, -1);
  const [lancamentosAtual, lancamentosAnterior] = await Promise.all([
    listLancamentosByMonth(uid, monthKey, { source }),
    listLancamentosByMonth(uid, anterior, { source }),
  ]);

  return {
    indicators: computeIndicators(lancamentosAtual, monthKey),
    comparacao: computeComparacao(lancamentosAtual, lancamentosAnterior),
    lancamentosAtual,
    lancamentosAnterior,
    documentCount: lancamentosAtual.length + lancamentosAnterior.length,
  };
}

/**
 * Fast first paint: only the two month queries needed for the visible totals.
 * Recurrence synchronization deliberately does not block these values.
 */
export async function getDashboardData(uid, monthKey, { source = 'default' } = {}) {
  const data = await loadDashboardMonths(uid, monthKey, source);
  // A non-empty IndexedDB result is useful for later navigation in the same
  // session. An empty cache is ignored because it may only be a cache miss.
  if (source !== 'cache' || data.documentCount > 0) {
    setDashboardMemoryCache(uid, monthKey, data);
  }
  return data;
}

/**
 * Runs after the totals are already visible. Both months share one recurrence
 * range query; only when new instances are written do we re-read the totals.
 * Returns null in the common no-change case.
 */
export async function syncDashboardRecorrencias(uid, monthKey) {
  const anterior = shiftMonthKey(monthKey, -1);
  const recorrencias = await listRecorrencias(uid);
  const gerouAlgo = await ensureGeneratedForMonths(uid, [anterior, monthKey], recorrencias);
  if (!gerouAlgo) return null;
  const data = await loadDashboardMonths(uid, monthKey, 'server');
  setDashboardMemoryCache(uid, monthKey, data);
  return data;
}

const CONFIG_COLLECTION = 'config';
const CONFIG_DOC = 'geral';

/** Meta mensal de economia do "Desafio de economia" — um único valor por usuário. */
export async function getMetaEconomiaMensal(uid) {
  const doc = await getUserDoc(uid, CONFIG_COLLECTION, CONFIG_DOC);
  return doc?.metaEconomiaMensal ?? null;
}

export async function setMetaEconomiaMensal(uid, valor) {
  await setUserDocMerged(uid, CONFIG_COLLECTION, CONFIG_DOC, { metaEconomiaMensal: valor });
}
