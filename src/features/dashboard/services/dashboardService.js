import { listLancamentosByMonth } from '../../lancamentos/services/lancamentosService.js';
import { ensureGeneratedForMonth } from '../../recorrencias/services/recorrenciasService.js';

/**
 * Computes the headline indicators for the given 'YYYY-MM' month:
 * saldo do mês, total a pagar, total a receber.
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

    if (item.status === 'pago' || item.status === 'recebido') {
      saldoMes += isReceita ? valor : -valor;
    } else {
      if (isReceita) totalAReceber += valor;
      else totalAPagar += valor;
    }

    if (item.status === 'atrasado') contasAtrasadas += 1;
  }

  return { saldoMes, totalAPagar, totalAReceber, contasAtrasadas };
}
