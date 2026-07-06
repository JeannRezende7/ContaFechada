import { listLancamentosByMonth } from '../../lancamentos/services/lancamentosService.js';
import { listRecorrencias, ensureGeneratedForMonth } from '../../recorrencias/services/recorrenciasService.js';
import { shiftMonthKey, getCurrentMonthKey } from '../../../utils/monthKey.js';
import { getUserDoc, setUserDocMerged } from '../../../firebase/firestore.js';

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

    if (item.status === 'atrasado') contasAtrasadas += 1;

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

/**
 * Everything the Início page needs, fetched with as few sequential round
 * trips as possible: recorrências + both months' lançamentos fire in one
 * parallel batch (sharing the recorrências list instead of each caller
 * re-fetching it), and each month is only re-read if `ensureGeneratedForMonth`
 * actually created something new — the common case (already generated)
 * needs zero extra round trips.
 * MVP version: works client-side over each month's lancamentos.
 * Move to a Cloud Function / aggregation query once volume grows.
 */
export async function getDashboardData(uid, monthKey) {
  const anterior = shiftMonthKey(monthKey, -1);

  const [recorrencias, lancamentosAtual0, lancamentosAnterior0] = await Promise.all([
    listRecorrencias(uid),
    listLancamentosByMonth(uid, monthKey),
    listLancamentosByMonth(uid, anterior),
  ]);

  const [gerouAtual, gerouAnterior] = await Promise.all([
    ensureGeneratedForMonth(uid, monthKey, recorrencias),
    ensureGeneratedForMonth(uid, anterior, recorrencias),
  ]);

  const [lancamentosAtual, lancamentosAnterior] = await Promise.all([
    gerouAtual ? listLancamentosByMonth(uid, monthKey) : lancamentosAtual0,
    gerouAnterior ? listLancamentosByMonth(uid, anterior) : lancamentosAnterior0,
  ]);

  return {
    indicators: computeIndicators(lancamentosAtual, monthKey),
    comparacao: computeComparacao(lancamentosAtual, lancamentosAnterior),
  };
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
