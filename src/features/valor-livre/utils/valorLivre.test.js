import { describe, expect, it } from 'vitest';
import { calcularPlanejamentoCategorias, calcularValorLivre, criarSugestao } from './valorLivre.js';

describe('valor livre', () => {
  it('compara o planejamento por categoria com os gastos do mês', () => {
    const resultado = calcularPlanejamentoCategorias([
      { id: '1', tipo: 'despesa', categoriaId: 'mercado', valor: 350 },
      { id: '2', tipo: 'despesa', categoriaId: 'lazer', valor: 250 },
      { id: '3', tipo: 'despesa', categoriaId: '', valor: 40 },
      { id: '4', tipo: 'despesa', categoriaId: 'transporte', valor: 60 },
      { id: '5', tipo: 'receita', categoriaId: 'salario', valor: 5000 },
    ], [
      { id: 'p1', categoriaId: 'mercado', valor: 500 },
      { id: 'p2', categoriaId: 'lazer', valor: 200 },
    ]);

    expect(resultado.totalPlanejado).toBe(700);
    expect(resultado.totalGasto).toBe(700);
    expect(resultado.itens).toEqual(expect.arrayContaining([
      expect.objectContaining({ categoriaId: 'mercado', gasto: 350, restante: 150 }),
      expect.objectContaining({ categoriaId: 'lazer', gasto: 250, restante: -50 }),
    ]));
    expect(resultado.semPlanejamento).toEqual(expect.arrayContaining([
      expect.objectContaining({ categoriaId: '', gasto: 40 }),
      expect.objectContaining({ categoriaId: 'transporte', gasto: 60 }),
    ]));
  });

  it('mostra o valor livre real e mantém a base de distribuição após contas fixas', () => {
    const resultado = calcularValorLivre([
      { tipo: 'receita', valor: 5000 },
      { tipo: 'despesa', valor: 1200, origemRecorrenciaId: 'aluguel', categoriaId: 'casa' },
      { tipo: 'despesa', valor: 250, categoriaId: 'mercado' },
    ], [{ id: '1', nome: 'Comida', categoriaId: 'mercado', percentual: 25 }], 3800);

    expect(resultado).toMatchObject({
      renda: 5000,
      contasFixas: 1200,
      baseDistribuicao: 3800,
      valorLivre: 3800,
      totalPlanejado: 950,
      naoDistribuido: 2850,
    });
    expect(resultado.itens[0]).toMatchObject({ gasto: 250, disponivel: 700 });
  });

  it('não oferece dinheiro para gastar quando o valor livre está negativo', () => {
    const resultado = calcularValorLivre([
      { tipo: 'receita', valor: 7207 },
      { tipo: 'despesa', valor: 2045, origemRecorrenciaId: 'fixas' },
      { tipo: 'despesa', valor: 5536, categoriaId: 'casa' },
    ], [
      { id: '1', categoriaId: 'casa', percentual: 50 },
      { id: '2', categoriaId: 'lazer', percentual: 30 },
      { id: '3', categoriaId: 'poupanca', percentual: 20 },
    ], -374, { casa: 5536 });

    expect(resultado.valorLivre).toBe(-374);
    expect(resultado.itens.map((item) => item.disponivel)).toEqual([-5536, 0, 0]);
    expect(resultado.naoDistribuido).toBe(-374);
  });

  it('considera todos os gastos do mês no disponível, inclusive os anteriores à fotografia', () => {
    const resultado = calcularValorLivre([
      { tipo: 'receita', valor: 5260 },
      { tipo: 'despesa', valor: 2045, origemRecorrenciaId: 'fixas' },
      { tipo: 'despesa', valor: 2367, categoriaId: 'casa' },
    ], [
      { id: '1', categoriaId: 'casa', percentual: 50 },
      { id: '2', categoriaId: 'lazer', percentual: 30 },
      { id: '3', categoriaId: 'poupanca', percentual: 20 },
    ], 848, { casa: 2367 });

    expect(resultado.valorLivre).toBe(848);
    expect(resultado.saldoAtual).toBe(848);
    expect(resultado.itens.map((item) => item.disponivel)).toEqual([-1943, 254.4, 169.6]);
    expect(resultado.naoDistribuido).toBe(0);
  });

  it('destaca gastos de categorias não distribuídas e lançamentos sem categoria', () => {
    const resultado = calcularValorLivre([
      { tipo: 'receita', valor: 1000 },
      { tipo: 'despesa', valor: 80, categoriaId: 'transporte' },
      { tipo: 'despesa', valor: 20 },
    ], [{ id: '1', categoriaId: 'lazer', percentual: 100 }], 1000, {});

    expect(resultado.gastosForaDistribuicao).toEqual({
      gasto: 100,
      gastoDepoisDaFotografia: 100,
    });
    expect(resultado.naoDistribuido).toBe(-100);
  });

  it('sugere uma distribuição que soma 100% do valor livre', () => {
    const sugestao = criarSugestao(1000, []);
    expect(sugestao.reduce((total, item) => total + item.valor, 0)).toBe(1000);
  });

  it('distribui 50/30/20 sobre o valor que ficou livre', () => {
    const sugestao = criarSugestao(1915, []);
    expect(sugestao.map((item) => item.valor)).toEqual([957.5, 574.5, 383]);
  });

  it('mantém o planejamento operacional durante o fluxo completo de lançamento e edição', () => {
    const fotografia = 1000;
    const gastosIniciais = { casa: 200 };
    const distribuicoes = [
      { id: 'necessidades', categoriaId: 'casa', percentual: 50 },
      { id: 'lazer', categoriaId: 'lazer', percentual: 30 },
      { id: 'reserva', categoriaId: 'investimentos', percentual: 20 },
    ];
    const base = [
      { id: 'renda', tipo: 'receita', valor: 2200 },
      { id: 'fixa', tipo: 'despesa', valor: 1000, origemRecorrenciaId: 'aluguel', categoriaId: 'casa' },
      { id: 'anterior', tipo: 'despesa', valor: 200, categoriaId: 'casa' },
    ];

    const depoisDoLancamento = calcularValorLivre([
      ...base,
      { id: 'novo', tipo: 'despesa', valor: 100, categoriaId: 'lazer' },
      { id: 'fora', tipo: 'despesa', valor: 50 },
    ], distribuicoes, fotografia, gastosIniciais);

    expect(depoisDoLancamento.valorLivre).toBe(1000);
    expect(depoisDoLancamento.itens.map((item) => item.disponivel)).toEqual([300, 200, 200]);
    expect(depoisDoLancamento.gastosForaDistribuicao.gastoDepoisDaFotografia).toBe(50);
    expect(depoisDoLancamento.naoDistribuido).toBe(-50);

    const depoisDaEdicao = calcularValorLivre([
      ...base,
      { id: 'novo', tipo: 'despesa', valor: 80, categoriaId: 'casa' },
      { id: 'fora', tipo: 'despesa', valor: 50, categoriaId: 'lazer' },
    ], distribuicoes, fotografia, gastosIniciais);

    expect(depoisDaEdicao.valorLivre).toBe(1000);
    expect(depoisDaEdicao.itens.map((item) => item.disponivel)).toEqual([220, 250, 200]);
    expect(depoisDaEdicao.gastosForaDistribuicao.gastoDepoisDaFotografia).toBe(0);
    expect(depoisDaEdicao.naoDistribuido).toBe(0);
  });
});
