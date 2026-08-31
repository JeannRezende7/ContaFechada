import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../repositories/index.js', () => ({
  repositories: {
    lancamentos: { listByMonth: vi.fn() },
    categorias: { list: vi.fn() },
  },
}));

import { repositories } from '../../../repositories/index.js';
import { getEvolucaoMensal, getGastosPorCategoria } from './relatoriosService.js';

describe('relatoriosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('agrupa os lançamentos do repositório ativo por categoria', async () => {
    repositories.lancamentos.listByMonth.mockResolvedValue([
      { tipo: 'despesa', categoriaId: 'mercado', valor: 75 },
      { tipo: 'despesa', categoriaId: 'mercado', valor: '25.50' },
      { tipo: 'receita', categoriaId: 'salario', valor: 1000 },
      { tipo: 'despesa', categoriaId: null, valor: 10 },
    ]);
    repositories.categorias.list.mockResolvedValue([
      { id: 'mercado', nome: 'Mercado', corKey: 'verde' },
      { id: 'salario', nome: 'Salário', corKey: 'azul' },
    ]);

    await expect(getGastosPorCategoria('u1', '2026-08', 'despesa')).resolves.toEqual({
      items: [
        { id: 'mercado', nome: 'Mercado', corKey: 'verde', total: 100.5 },
        { id: '__sem_categoria__', nome: 'Sem categoria', corKey: 'cinza', total: 10 },
      ],
      totalGeral: 110.5,
    });
    expect(repositories.lancamentos.listByMonth).toHaveBeenCalledWith('u1', '2026-08');
    expect(repositories.categorias.list).toHaveBeenCalledWith('u1');
  });

  it('monta a evolução mensal usando o mesmo repositório ativo', async () => {
    repositories.lancamentos.listByMonth
      .mockResolvedValueOnce([{ tipo: 'receita', valor: 300 }])
      .mockResolvedValueOnce([{ tipo: 'despesa', valor: 80 }])
      .mockResolvedValueOnce([
        { tipo: 'receita', valor: 500 },
        { tipo: 'despesa', valor: 120 },
      ]);

    await expect(getEvolucaoMensal('u1', '2026-08', 3)).resolves.toEqual([
      { monthKey: '2026-06', label: 'Jun/26', receitas: 300, despesas: 0 },
      { monthKey: '2026-07', label: 'Jul/26', receitas: 0, despesas: 80 },
      { monthKey: '2026-08', label: 'Ago/26', receitas: 500, despesas: 120 },
    ]);
    expect(repositories.lancamentos.listByMonth.mock.calls).toEqual([
      ['u1', '2026-06'],
      ['u1', '2026-07'],
      ['u1', '2026-08'],
    ]);
  });
});
