function numericValue(item) {
  return Number(item.valor) || 0;
}

function isPending(item) {
  return item.status !== 'pago' && item.status !== 'recebido';
}

export function calcularPrevisao(lancamentos, monthKey, saldoInicial = 0, today = new Date().toISOString().slice(0, 10)) {
  const eventsByDate = {};
  let receitasPrevistas = 0;
  let despesasPrevistas = 0;
  for (const item of lancamentos) {
    if (!item.dataVencimento?.startsWith(monthKey)) continue;
    const value = numericValue(item);
    if (item.tipo === 'receita') receitasPrevistas += value;
    else despesasPrevistas += value;
    const signedValue = item.tipo === 'receita' ? value : -value;
    eventsByDate[item.dataVencimento] = (eventsByDate[item.dataVencimento] ?? 0) + signedValue;
  }

  let balance = Number(saldoInicial) || 0;
  let minimumBalance = balance;
  let negativeDate = balance < 0 ? `${monthKey}-01` : null;
  let balanceToday = balance;
  const timeline = Object.entries(eventsByDate)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, movement]) => {
      balance += movement;
      if (balance < minimumBalance) minimumBalance = balance;
      if (!negativeDate && balance < 0) negativeDate = date;
      if (date <= today) balanceToday = balance;
      return { date, movement, balance };
    });

  if (monthKey < today.slice(0, 7)) balanceToday = balance;
  if (monthKey > today.slice(0, 7)) balanceToday = Number(saldoInicial) || 0;

  return {
    saldoInicial: Number(saldoInicial) || 0,
    receitasPrevistas,
    despesasPrevistas,
    saldoHojePrevisto: balanceToday,
    saldoFinalPrevisto: balance,
    menorSaldoPrevisto: minimumBalance,
    dataSaldoNegativo: negativeDate,
    timeline,
  };
}

export function calcularOrcamentos(lancamentos, categorias, budgets, monthKey) {
  const spentByCategory = {};
  for (const item of lancamentos) {
    if (
      item.tipo !== 'despesa' ||
      !item.dataVencimento?.startsWith(monthKey) ||
      !item.categoriaId
    ) continue;
    spentByCategory[item.categoriaId] =
      (spentByCategory[item.categoriaId] ?? 0) + numericValue(item);
  }

  return categorias
    .filter((categoria) => categoria.tipo === 'despesa')
    .map((categoria) => {
      const limite = Number(budgets[categoria.id]) || 0;
      const gasto = spentByCategory[categoria.id] ?? 0;
      const percentual = limite > 0 ? (gasto / limite) * 100 : 0;
      return {
        categoria,
        limite,
        gasto,
        restante: limite - gasto,
        percentual,
        status: limite <= 0 ? 'sem_limite' : percentual >= 100 ? 'excedido' : percentual >= 80 ? 'atencao' : 'ok',
      };
    })
    .sort((a, b) => {
      if (a.limite > 0 && b.limite <= 0) return -1;
      if (a.limite <= 0 && b.limite > 0) return 1;
      return b.percentual - a.percentual || a.categoria.nome.localeCompare(b.categoria.nome);
    });
}

export function calcularPendencias(lancamentos, recorrencias, today = new Date().toISOString().slice(0, 10)) {
  const inSevenDays = new Date(`${today}T12:00:00`);
  inSevenDays.setDate(inSevenDays.getDate() + 7);
  const sevenDaysISO = inSevenDays.toISOString().slice(0, 10);

  const atrasadas = [];
  const proximosVencimentos = [];
  const receitasPendentes = [];
  const semCategoria = [];
  const parcelamentosFinalizando = [];

  for (const item of lancamentos) {
    if (!item.categoriaId) semCategoria.push(item);
    if (!isPending(item)) continue;
    if (!item.dataVencimento) {
      continue;
    }
    if (item.dataVencimento < today) atrasadas.push(item);
    if (item.dataVencimento >= today && item.dataVencimento <= sevenDaysISO) {
      proximosVencimentos.push(item);
    }
    if (item.tipo === 'receita') receitasPendentes.push(item);
    if (
      item.parcelamentoId &&
      item.totalParcelas &&
      item.parcelaAtual >= item.totalParcelas - 1
    ) {
      parcelamentosFinalizando.push(item);
    }
  }

  const recorrenciasParaRevisar = recorrencias.filter(
    (item) => item.ativo && (!item.categoriaId || !item.valor || !item.diaVencimento)
  );
  const byDate = (a, b) => a.dataVencimento.localeCompare(b.dataVencimento);

  return {
    atrasadas: atrasadas.sort(byDate),
    proximosVencimentos: proximosVencimentos.sort(byDate),
    receitasPendentes: receitasPendentes.sort(byDate),
    semCategoria: semCategoria.sort(byDate),
    recorrenciasParaRevisar,
    parcelamentosFinalizando: parcelamentosFinalizando.sort(byDate),
  };
}
