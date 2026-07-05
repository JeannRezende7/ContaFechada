import { formatCurrency } from '../../../utils/formatCurrency.js';

/**
 * Rule-based "insights" — no LLM call involved, just arithmetic over the
 * month's own numbers. Framed in natural language so it reads like an
 * observation, but every sentence traces back to a plain comparison.
 */
export function computeInsights({
  despesaPorCategoriaAtual,
  despesaPorCategoriaAnterior,
  categoriasById,
  saldoMes,
  diasRestantes,
  diasNoMes,
}) {
  const insights = [];

  // Maior alta percentual de gasto por categoria vs. mês anterior.
  let maiorAlta = null;
  for (const [categoriaId, valorAtual] of Object.entries(despesaPorCategoriaAtual)) {
    const valorAnterior = despesaPorCategoriaAnterior[categoriaId] ?? 0;
    if (valorAnterior < 20 || valorAtual <= valorAnterior) continue;
    const variacao = ((valorAtual - valorAnterior) / valorAnterior) * 100;
    if (variacao >= 20 && (!maiorAlta || variacao > maiorAlta.variacao)) {
      maiorAlta = { categoriaId, variacao };
    }
  }
  if (maiorAlta) {
    const nome = categoriasById[maiorAlta.categoriaId]?.nome ?? 'essa categoria';
    insights.push(`Você gastou ${Math.round(maiorAlta.variacao)}% a mais com ${nome} este mês.`);
  }

  // Projeção linear: se o ritmo de gasto diário atual continuar, quando o
  // saldo cruza zero dentro do próprio mês.
  const diasDecorridos = diasNoMes - diasRestantes;
  if (saldoMes < 0 && diasDecorridos > 0) {
    insights.push(
      `Seu saldo já está negativo em ${formatCurrency(Math.abs(saldoMes))} este mês.`
    );
  } else if (saldoMes > 0 && diasRestantes > 0 && diasDecorridos > 2) {
    const ritmoDiario = saldoMes / diasDecorridos;
    if (ritmoDiario < 0) {
      const diasAteZerar = Math.floor(saldoMes / -ritmoDiario);
      if (diasAteZerar >= 0 && diasAteZerar < diasRestantes) {
        const diaEstimado = diasDecorridos + diasAteZerar + 1;
        insights.push(`Se continuar nesse ritmo, seu saldo pode ficar negativo por volta do dia ${diaEstimado}.`);
      }
    }
  }

  return insights.slice(0, 3);
}
