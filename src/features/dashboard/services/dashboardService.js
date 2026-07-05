import { listLancamentosByMonth } from '../../lancamentos/services/lancamentosService.js';
import { ensureGeneratedForMonth } from '../../recorrencias/services/recorrenciasService.js';
import { shiftMonthKey, getCurrentMonthKey } from '../../../utils/monthKey.js';
import { getUserDoc, setUserDoc } from '../../../firebase/firestore.js';

/**
 * Computes the headline indicators for the given 'YYYY-MM' month:
 * saldo do mês, total a pagar, total a receber.
 * `saldoMes` nets every lançamento regardless of status (same "receita total
 * - despesa total" the Lançamentos page shows) — pending items aren't yet
 * money that moved, but the user still needs to see where the month is
 * heading, not just what's already settled.
 * MVP version: works client-side over that month's lancamentos.
 * Move to a Cloud Function / aggregation query once volume grows.
 */
export async function getDashboardIndicators(uid, monthKey) {
  await ensureGeneratedForMonth(uid, monthKey);
  const lancamentos = await listLancamentosByMonth(uid, monthKey);

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

/**
 * Total de despesas do mês anterior ao informado — usado só para a
 * comparação mês a mês, por isso não recalcula os outros indicadores.
 */
export async function getDespesaMesAnterior(uid, monthKey) {
  const anterior = shiftMonthKey(monthKey, -1);
  await ensureGeneratedForMonth(uid, anterior);
  const lancamentos = await listLancamentosByMonth(uid, anterior);
  let despesaMes = 0;
  const porCategoria = {};
  for (const item of lancamentos) {
    if (item.tipo !== 'despesa') continue;
    const valor = Number(item.valor) || 0;
    despesaMes += valor;
    const chave = item.categoriaId ?? '_sem_categoria';
    porCategoria[chave] = (porCategoria[chave] ?? 0) + valor;
  }
  return { despesaMes, porCategoria };
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

/** Compara a despesa do mês com a do mês anterior, geral e por categoria. */
export async function getComparacaoMensal(uid, monthKey) {
  const lancamentosAtual = await listLancamentosByMonth(uid, monthKey);
  const porCategoriaAtual = agruparDespesaPorCategoria(lancamentosAtual);
  const despesaAtual = Object.values(porCategoriaAtual).reduce((a, b) => a + b, 0);

  const { despesaMes: despesaAnterior, porCategoria: porCategoriaAnterior } = await getDespesaMesAnterior(uid, monthKey);
  const percentual = despesaAnterior > 0 ? ((despesaAtual - despesaAnterior) / despesaAnterior) * 100 : null;

  return { despesaAtual, despesaAnterior, percentual, porCategoriaAtual, porCategoriaAnterior };
}

const CONFIG_COLLECTION = 'config';
const CONFIG_DOC = 'geral';

/** Meta mensal de economia do "Desafio de economia" — um único valor por usuário. */
export async function getMetaEconomiaMensal(uid) {
  const doc = await getUserDoc(uid, CONFIG_COLLECTION, CONFIG_DOC);
  return doc?.metaEconomiaMensal ?? null;
}

export async function setMetaEconomiaMensal(uid, valor) {
  await setUserDoc(uid, CONFIG_COLLECTION, CONFIG_DOC, { metaEconomiaMensal: valor });
}
