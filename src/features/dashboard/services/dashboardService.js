import { listLancamentosByMonth } from '../../lancamentos/services/lancamentosService.js';
import { ensureGeneratedForMonth } from '../../recorrencias/services/recorrenciasService.js';

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

  for (const item of lancamentos) {
    const valor = Number(item.valor) || 0;
    const isReceita = item.tipo === 'receita';

    saldoMes += isReceita ? valor : -valor;

    const isPendente = item.status !== 'pago' && item.status !== 'recebido';
    if (isPendente) {
      if (isReceita) totalAReceber += valor;
      else totalAPagar += valor;
    }

    if (item.status === 'atrasado') contasAtrasadas += 1;
  }

  return { saldoMes, totalAPagar, totalAReceber, contasAtrasadas };
}
