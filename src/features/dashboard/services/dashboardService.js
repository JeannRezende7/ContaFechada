import { listTenantDocs } from '../../../firebase/firestore.js';

/**
 * Computes the three headline indicators (REQ-05):
 * saldo atual, total a pagar no mês, total a receber no mês.
 * MVP version: works client-side over the lancamentos collection.
 * Move to a Cloud Function / aggregation query once volume grows.
 */
export async function getDashboardIndicators(slug) {
  const lancamentos = await listTenantDocs(slug, 'lancamentos');

  const now = new Date();
  const isCurrentMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  let saldoAtual = 0;
  let totalAPagar = 0;
  let totalAReceber = 0;
  let contasAtrasadas = 0;

  for (const item of lancamentos) {
    const valor = Number(item.valor) || 0;
    const isReceita = item.tipo === 'receita';

    if (item.status === 'pago' || item.status === 'recebido') {
      saldoAtual += isReceita ? valor : -valor;
    }

    if (isCurrentMonth(item.dataVencimento)) {
      if (isReceita && item.status !== 'recebido') totalAReceber += valor;
      if (!isReceita && item.status !== 'pago') totalAPagar += valor;
    }

    if (item.status === 'atrasado') contasAtrasadas += 1;
  }

  return { saldoAtual, totalAPagar, totalAReceber, contasAtrasadas };
}
