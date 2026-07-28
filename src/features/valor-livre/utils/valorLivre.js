export const SUGESTAO_DISTRIBUICAO = [
  { nome: 'Necessidades do mês', percentual: 50 },
  { nome: 'Lazer e desejos', percentual: 30 },
  { nome: 'Poupança e emergência', percentual: 20 },
];

const dinheiro = (valor) => Math.round((Number(valor) || 0) * 100) / 100;

export function calcularValorLivre(lancamentos = [], distribuicoes = []) {
  let renda = 0;
  let contasFixas = 0;
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
    if (item.categoriaId) {
      gastosPorCategoria[item.categoriaId] = dinheiro(
        (gastosPorCategoria[item.categoriaId] || 0) + valor
      );
    }
  }

  const valorLivre = dinheiro(renda - contasFixas);
  const itens = distribuicoes.map((item) => {
    const planejado = dinheiro(item.valor);
    const gasto = dinheiro(gastosPorCategoria[item.categoriaId] || 0);
    return {
      ...item,
      planejado,
      gasto,
      disponivel: dinheiro(planejado - gasto),
      percentualUsado: planejado > 0 ? Math.min(100, Math.round((gasto / planejado) * 100)) : 0,
    };
  });
  const totalPlanejado = dinheiro(itens.reduce((total, item) => total + item.planejado, 0));

  return {
    renda: dinheiro(renda),
    contasFixas: dinheiro(contasFixas),
    valorLivre,
    totalPlanejado,
    naoDistribuido: dinheiro(valorLivre - totalPlanejado),
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
