import { describe, expect, it } from 'vitest';
import { calcularValorLivre, criarSugestao } from './valorLivre.js';

describe('valor livre', () => {
  it('calcula renda menos despesas recorrentes e abate gastos pela categoria', () => {
    const resultado = calcularValorLivre([
      { tipo: 'receita', valor: 5000 },
      { tipo: 'despesa', valor: 1200, origemRecorrenciaId: 'aluguel', categoriaId: 'casa' },
      { tipo: 'despesa', valor: 250, categoriaId: 'mercado' },
    ], [{ id: '1', nome: 'Comida', categoriaId: 'mercado', valor: 1000 }]);

    expect(resultado).toMatchObject({
      renda: 5000,
      contasFixas: 1200,
      valorLivre: 3800,
      totalPlanejado: 1000,
      naoDistribuido: 2800,
    });
    expect(resultado.itens[0]).toMatchObject({ gasto: 250, disponivel: 750 });
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
