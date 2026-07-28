import { clampDayToMonth, shiftMonthKey } from '../../../utils/monthKey.js';

function buildScenario({ valor, entrada, parcelas, monthKey, diaVencimento }) {
  const financed = Math.max(0, Number(valor) - Number(entrada || 0));
  const installment = parcelas > 0 ? financed / parcelas : 0;
  const movements = [];
  if (Number(entrada) > 0) movements.push({ date: `${monthKey}-01`, value: -Number(entrada), simulated: true });
  for (let index = 0; index < parcelas; index++) {
    const targetMonth = shiftMonthKey(monthKey, index);
    const day = clampDayToMonth(targetMonth, Number(diaVencimento) || 1);
    movements.push({ date: `${targetMonth}-${String(day).padStart(2, '0')}`, value: -installment, simulated: true });
  }
  return { installment, movements };
}

export function simularParcelamento({
  valor,
  entrada = 0,
  parcelas,
  monthKey,
  diaVencimento = 10,
  saldoInicial = 0,
  lancamentos = [],
}) {
  const { installment, movements } = buildScenario({ valor, entrada, parcelas, monthKey, diaVencimento });
  const existing = lancamentos
    .filter((item) => item.dataVencimento >= `${monthKey}-01`)
    .map((item) => ({
      date: item.dataVencimento,
      value: (item.tipo === 'receita' ? 1 : -1) * Number(item.valor || 0),
    }));
  const timeline = [...existing, ...movements].sort((a, b) => a.date.localeCompare(b.date));
  let balance = Number(saldoInicial || 0);
  let minimum = balance;
  let negativeDate = null;
  for (const item of timeline) {
    balance += item.value;
    minimum = Math.min(minimum, balance);
    if (!negativeDate && balance < 0) negativeDate = item.date;
  }
  return {
    parcelas,
    valorParcela: Math.round(installment * 100) / 100,
    menorSaldo: Math.round(minimum * 100) / 100,
    saldoFinal: Math.round(balance * 100) / 100,
    dataNegativa: negativeDate,
    movements,
  };
}

export function compararParcelamentos(input) {
  const base = Math.max(1, Number(input.parcelas) || 1);
  const options = [...new Set([Math.max(1, base - 2), base, base + 2])];
  return options.map((parcelas) => simularParcelamento({ ...input, parcelas }));
}
