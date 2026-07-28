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
  lancamentosAtual = [],
  lancamentosAnterior = [],
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
    const current = despesaPorCategoriaAtual[maiorAlta.categoriaId] || 0;
    const previous = despesaPorCategoriaAnterior[maiorAlta.categoriaId] || 0;
    const drivers = lancamentosAtual
      .filter((item) => item.tipo === 'despesa' && (item.categoriaId ?? '_sem_categoria') === maiorAlta.categoriaId)
      .sort((a, b) => Number(b.valor) - Number(a.valor))
      .slice(0, 2)
      .map((item) => `${item.descricao} (${formatCurrency(item.valor)})`)
      .join(' e ');
    insights.push({
      title: `${Math.round(maiorAlta.variacao)}% a mais com ${nome}`,
      detail: `Comparação de ${formatCurrency(current)} com ${formatCurrency(previous)} no mês anterior.${drivers ? ` Maiores impactos: ${drivers}.` : ''}`,
      query: nome,
    });
    insights.push({
      title: `Orçamento sugerido para ${nome}: ${formatCurrency((current + previous) / 2)}`,
      detail: 'Sugestão calculada pela média simples dos gastos desta categoria nos dois últimos meses.',
      query: nome,
    });
  }

  // Projeção linear: se o ritmo de gasto diário atual continuar, quando o
  // saldo cruza zero dentro do próprio mês.
  const diasDecorridos = diasNoMes - diasRestantes;
  if (saldoMes < 0 && diasDecorridos > 0) {
    insights.push({ title: `Saldo negativo em ${formatCurrency(Math.abs(saldoMes))}`, detail: 'Receitas do mês menos todas as despesas cadastradas.', query: '' });
  } else if (saldoMes > 0 && diasRestantes > 0 && diasDecorridos > 2) {
    const ritmoDiario = saldoMes / diasDecorridos;
    if (ritmoDiario < 0) {
      const diasAteZerar = Math.floor(saldoMes / -ritmoDiario);
      if (diasAteZerar >= 0 && diasAteZerar < diasRestantes) {
        const diaEstimado = diasDecorridos + diasAteZerar + 1;
        insights.push({ title: `Risco de saldo negativo por volta do dia ${diaEstimado}`, detail: `Estimativa linear usando o saldo acumulado nos ${diasDecorridos} dias já decorridos.`, query: '' });
      }
    }
  }

  const expenses = lancamentosAtual.filter((item) => item.tipo === 'despesa');
  if (expenses.length >= 3) {
    const average = expenses.reduce((sum, item) => sum + Number(item.valor || 0), 0) / expenses.length;
    const unusual = [...expenses].sort((a, b) => Number(b.valor) - Number(a.valor))
      .find((item) => Number(item.valor) >= average * 2);
    if (unusual) insights.push({
      title: `Gasto incomum: ${unusual.descricao}`,
      detail: `${formatCurrency(unusual.valor)} é pelo menos o dobro da média de ${formatCurrency(average)} dos gastos deste mês.`,
      query: unusual.descricao,
    });
  }

  const previousNames = new Set(lancamentosAnterior.filter((item) => item.tipo === 'despesa').map((item) => item.descricao.toLocaleLowerCase('pt-BR')));
  const possibleSubscription = expenses.find((item) => previousNames.has(item.descricao.toLocaleLowerCase('pt-BR')) && !item.origemRecorrenciaId);
  if (possibleSubscription) insights.push({
    title: `Possível assinatura: ${possibleSubscription.descricao}`,
    detail: 'A mesma descrição apareceu como despesa neste mês e no anterior, mas não está marcada como recorrente.',
    query: possibleSubscription.descricao,
  });

  const income = lancamentosAtual.filter((item) => item.tipo === 'receita').reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const committed = expenses.filter((item) => item.origemRecorrenciaId || item.parcelamentoId).reduce((sum, item) => sum + Number(item.valor || 0), 0);
  if (income > 0 && committed / income >= 0.4) insights.push({
    title: `${Math.round((committed / income) * 100)}% da renda já está comprometida`,
    detail: `${formatCurrency(committed)} em recorrências e parcelas sobre ${formatCurrency(income)} de receitas cadastradas.`,
    query: '',
  });

  return insights.slice(0, 5);
}
