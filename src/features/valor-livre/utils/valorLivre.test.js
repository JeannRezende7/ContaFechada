import { describe, expect, it } from 'vitest';
import { calcularValorLivre, criarSugestao } from './valorLivre.js';

describe('valor livre', () => {
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
    expect(resultado.itens.map((item) => item.disponivel)).toEqual([0, 0, 0]);
    expect(resultado.naoDistribuido).toBe(-374);
  });

  it('mantém fixa a fotografia mensal enquanto os gastos consomem os limites', () => {
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
    expect(resultado.itens.map((item) => item.disponivel)).toEqual([424, 254.4, 169.6]);
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
});
