/**
 * Pure analysis over a full lançamentos list (Movimento or the Gestor's own
 * snapshot — the shape is the same either way): committed income for the
 * given month, every active commitment (installment plans, whose remaining
 * balance is computed across all months, plus recurring bills still active
 * this month), and a few heuristic suggestions.
 *
 * "Comprometida" (committed) means despesas tied to a parcelamento or a
 * recorrência — structurally identifiable via `parcelamentoId` /
 * `origemRecorrenciaId` on the lançamento itself, so this works the same
 * whether the source is the live Movimento or a manually imported subset.
 * `parcelamentosAtivos` in the return value actually mixes both kinds —
 * distinguish with the `tipo` field ('parcelamento' | 'recorrente').
 *
 * A recorrência imported directly (via `recorrenciaImportada: true`, from
 * the Gestor's "Importar recorrências" flow) has no `dataVencimento` at all
 * — it's not one dated transaction, it's a standing monthly commitment — so
 * it counts toward every month's totals rather than only the month it
 * happens to fall in.
 */
export function analisarFinancas(todosLancamentos, monthKey) {
  const doMes = todosLancamentos.filter((l) => l.dataVencimento?.startsWith(monthKey));
  const recorrentesImportadas = todosLancamentos.filter((l) => l.recorrenciaImportada);
  const doMesComRecorrentes = [...doMes, ...recorrentesImportadas];

  let rendaMes = 0;
  let despesaMes = 0;
  let despesaComprometida = 0;
  for (const l of doMesComRecorrentes) {
    const valor = Number(l.valor) || 0;
    if (l.tipo === 'receita') {
      rendaMes += valor;
    } else {
      despesaMes += valor;
      if (l.parcelamentoId || l.origemRecorrenciaId) despesaComprometida += valor;
    }
  }
  const percentualComprometido = rendaMes > 0 ? (despesaComprometida / rendaMes) * 100 : null;

  const porParcelamento = {};
  for (const l of todosLancamentos) {
    if (!l.parcelamentoId) continue;
    (porParcelamento[l.parcelamentoId] ??= []).push(l);
  }

  const parcelamentosAtivos = Object.values(porParcelamento)
    .map((parcelas) => {
      const pendentes = parcelas
        .filter((p) => p.status !== 'pago' && p.status !== 'recebido')
        .sort((a, b) => (a.parcelaAtual ?? 0) - (b.parcelaAtual ?? 0));
      if (pendentes.length === 0) return null;

      const proxima = pendentes[0];
      const valorRestante = pendentes.reduce((soma, p) => soma + (Number(p.valor) || 0), 0);
      return {
        tipo: 'parcelamento',
        descricao: (proxima.descricao ?? '').replace(/\s*\(\d+\/\d+\)\s*$/, ''),
        parcelaAtual: proxima.parcelaAtual,
        totalParcelas: proxima.totalParcelas,
        valorParcela: Number(proxima.valor) || 0,
        valorRestante,
      };
    })
    .filter(Boolean);

  // Contas recorrentes ainda ativas este mês contam como compromisso igual a
  // um parcelamento — só que sem data pra acabar, então não têm "restante".
  // Uma recorrência importada diretamente (sem dataVencimento) vale para
  // qualquer mês e tem prioridade sobre uma instância datada do mesmo mês,
  // evitando contar a mesma recorrência duas vezes.
  const porRecorrencia = {};
  for (const l of doMes) {
    if (l.tipo !== 'despesa' || !l.origemRecorrenciaId) continue;
    porRecorrencia[l.origemRecorrenciaId] = l;
  }
  for (const l of recorrentesImportadas) {
    if (l.tipo !== 'despesa' || !l.origemRecorrenciaId) continue;
    porRecorrencia[l.origemRecorrenciaId] = l;
  }
  const recorrenciasAtivas = Object.values(porRecorrencia).map((l) => ({
    tipo: 'recorrente',
    descricao: l.descricao ?? '',
    parcelaAtual: null,
    totalParcelas: null,
    valorParcela: Number(l.valor) || 0,
    valorRestante: null,
  }));

  const compromissosAtivos = [...parcelamentosAtivos, ...recorrenciasAtivas].sort(
    (a, b) => b.valorParcela - a.valorParcela
  );

  const sugestoes = [];
  if (percentualComprometido != null) {
    if (percentualComprometido >= 50) {
      sugestoes.push(
        'Mais da metade da sua renda está comprometida com parcelas e contas fixas — evite novos parcelamentos até esse número cair.'
      );
    } else if (percentualComprometido >= 30) {
      sugestoes.push(
        'Sua renda comprometida está acima de 30% (o limite geralmente recomendado) — vale reavaliar antes de assumir novos compromissos.'
      );
    } else {
      sugestoes.push('Sua renda comprometida está num nível saudável, abaixo de 30%.');
    }
  }
  if (compromissosAtivos.length >= 4) {
    sugestoes.push(`Você tem ${compromissosAtivos.length} compromissos ativos ao mesmo tempo (parcelas + recorrências) — considere quitar ou cancelar algum antes de assumir outro.`);
  }
  const maiorCompromisso = compromissosAtivos[0];
  if (maiorCompromisso && rendaMes > 0 && maiorCompromisso.valorParcela / rendaMes > 0.2) {
    sugestoes.push(`"${maiorCompromisso.descricao}" sozinho compromete mais de 20% da sua renda mensal.`);
  }

  return {
    rendaMes,
    despesaMes,
    despesaComprometida,
    percentualComprometido,
    parcelamentosAtivos: compromissosAtivos,
    sugestoes,
  };
}
