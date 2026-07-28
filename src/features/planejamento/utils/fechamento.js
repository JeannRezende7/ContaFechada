import { clampDayToMonth, shiftMonthKey } from '../../../utils/monthKey.js';

const settled = new Set(['pago', 'recebido']);

export function calcularFechamento(lancamentos, monthKey, saldoInicial = 0) {
  const items = lancamentos.filter((item) => item.dataVencimento?.slice(0, 7) === monthKey);
  const receitas = items.filter((item) => item.tipo === 'receita' && settled.has(item.status))
    .reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const despesas = items.filter((item) => item.tipo === 'despesa' && settled.has(item.status))
    .reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const pendentes = items.filter((item) => !settled.has(item.status));
  return {
    receitas,
    despesas,
    saldoCalculado: Number(saldoInicial || 0) + receitas - despesas,
    pendentes,
    totalLancamentos: items.length,
  };
}

export function construirAdiamentoPendencias(items, monthKey) {
  const nextMonth = shiftMonthKey(monthKey, 1);
  return Object.fromEntries(items.map((item) => {
    const day = Number(item.dataVencimento?.slice(8, 10)) || 1;
    const clamped = clampDayToMonth(nextMonth, day);
    return [item.id, { dataVencimento: `${nextMonth}-${String(clamped).padStart(2, '0')}` }];
  }));
}
