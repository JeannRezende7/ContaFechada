export const SUGESTAO_DISTRIBUICAO = [
  { nome: 'Necessidades do mês', percentual: 50 },
  { nome: 'Lazer e desejos', percentual: 30 },
  { nome: 'Poupança e emergência', percentual: 20 },
];

const dinheiro = (valor) => Math.round((Number(valor) || 0) * 100) / 100;
const SEM_CATEGORIA = '__sem_categoria__';

export function calcularSaldoLancamentos(lancamentos = []) {
  return dinheiro(lancamentos.reduce((total, item) => {
    const valor = dinheiro(item.valor);
    if (item.tipo === 'receita') return total + valor;
    if (item.tipo === 'despesa') return total - valor;
    return total;
  }, 0));
}

export function calcularGastosPorCategoria(lancamentos = []) {
  const gastos = {};
  for (const item of lancamentos) {
    if (item.tipo !== 'despesa' || item.origemRecorrenciaId) continue;
    const categoriaId = item.categoriaId || SEM_CATEGORIA;
    gastos[categoriaId] = dinheiro((gastos[categoriaId] || 0) + dinheiro(item.valor));
  }
  return gastos;
}

export function calcularValorLivre(lancamentos = [], distribuicoes = [], valorBaseMensal = null, gastosIniciais = {}) {
  let renda = 0;
  let contasFixas = 0;
  let outrasDespesas = 0;
  const gastosPorCategoria = {};

  for (const item of lancamentos) {
    const valor = dinheiro(item.valor);
    if (item.tipo === 'receita') {
      renda += valor;
      continue;
    }
    if (item.tipo !== 'despesa') continue;
    if (item.origemRecorrenciaId) {
      contasFixas += valor;
      continue;
    }
    outrasDespesas += valor;
    const categoriaId = item.categoriaId || SEM_CATEGORIA;
    gastosPorCategoria[categoriaId] = dinheiro(
      (gastosPorCategoria[categoriaId] || 0) + valor
    );
  }

  // A base de distribuicao e o que sobra depois das contas fixas. O valor
  // livre exibido, porem, precisa refletir tambem o que ja foi gasto no mes.
  const baseDistribuicao = dinheiro(renda - contasFixas);
  const saldoAtual = dinheiro(baseDistribuicao - outrasDespesas);
  const valorLivre = valorBaseMensal === null || valorBaseMensal === undefined
    ? saldoAtual
    : dinheiro(valorBaseMensal);
  const saldoDistribuivel = Math.max(0, valorLivre);
  const itens = distribuicoes.map((item) => {
    const percentual = Math.max(0, Number(item.percentual) || 0);
    const temPercentual = item.percentual !== undefined && item.percentual !== null;
    const planejado = dinheiro(temPercentual
      ? saldoDistribuivel * percentual / 100
      : item.valor);
    const gasto = dinheiro(gastosPorCategoria[item.categoriaId] || 0);
    const gastoInicial = dinheiro(gastosIniciais[item.categoriaId] || 0);
    const gastoDepoisDaFotografia = dinheiro(Math.max(0, gasto - gastoInicial));
    return {
      ...item,
      planejado,
      gasto,
      gastoDepoisDaFotografia,
      disponivel: dinheiro(planejado - gastoDepoisDaFotografia),
      percentualUsado: planejado > 0 ? Math.min(100, Math.round((gastoDepoisDaFotografia / planejado) * 100)) : 0,
    };
  });
  const totalPlanejado = dinheiro(itens.reduce((total, item) => total + item.planejado, 0));
  const categoriasDistribuidas = new Set(distribuicoes.map((item) => item.categoriaId).filter(Boolean));
  const categoriasFora = Object.keys(gastosPorCategoria).filter((id) => !categoriasDistribuidas.has(id));
  const gastoFora = dinheiro(categoriasFora.reduce(
    (total, id) => total + dinheiro(gastosPorCategoria[id]), 0
  ));
  const gastoInicialFora = dinheiro(categoriasFora.reduce(
    (total, id) => total + dinheiro(gastosIniciais[id]), 0
  ));
  const gastoForaDepoisDaFotografia = dinheiro(Math.max(0, gastoFora - gastoInicialFora));

  return {
    renda: dinheiro(renda),
    contasFixas: dinheiro(contasFixas),
    outrasDespesas: dinheiro(outrasDespesas),
    baseDistribuicao,
    valorLivre,
    saldoAtual,
    totalPlanejado,
    naoDistribuido: dinheiro(valorLivre - totalPlanejado - gastoForaDepoisDaFotografia),
    gastosForaDistribuicao: {
      gasto: gastoFora,
      gastoDepoisDaFotografia: gastoForaDepoisDaFotografia,
    },
    itens,
  };
}

export function criarSugestao(valorLivre, categorias = []) {
  const despesas = categorias.filter((categoria) => categoria.tipo === 'despesa');
  const procurar = (termos) => despesas.find((categoria) => (
    termos.some((termo) => categoria.nome.toLocaleLowerCase('pt-BR').includes(termo))
  ))?.id || '';

  const categoriasSugeridas = [
    procurar(['mercado', 'comida', 'contas da casa']),
    procurar(['lazer', 'cinema', 'show', 'jogos', 'hobbies']),
    procurar(['emergência', 'investimento']),
  ];

  return SUGESTAO_DISTRIBUICAO.map((item, index) => ({
    id: crypto.randomUUID(),
    nome: item.nome,
    categoriaId: categoriasSugeridas[index],
    percentual: item.percentual,
    descontaContasFixas: false,
    valor: dinheiro(Math.max(0, valorLivre) * item.percentual / 100),
  }));
}
