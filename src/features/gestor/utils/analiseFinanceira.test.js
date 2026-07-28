import { describe, expect, it } from 'vitest';
import { analisarFinancas } from './analiseFinanceira.js';

describe('analisarFinancas', () => {
  it('calculates income, expenses and committed percentage for the selected month', () => {
    const result = analisarFinancas([
      { tipo: 'receita', valor: 5000, dataVencimento: '2026-07-05' },
      { tipo: 'despesa', valor: 1000, dataVencimento: '2026-07-10' },
      { tipo: 'despesa', valor: 999, dataVencimento: '2026-06-10' },
    ], '2026-07');

    expect(result).toMatchObject({
      rendaMes: 5000,
      despesaMes: 1000,
      despesaComprometida: 1000,
      percentualComprometido: 20,
    });
    expect(result.sugestoes[0]).toContain('abaixo de 30%');
  });

  it('shows only the installment due in the selected month and its unpaid remaining balance', () => {
    const parcelas = [1, 2, 3].map((n) => ({
      tipo: 'despesa',
      descricao: `Celular (${n}/3)`,
      valor: 100,
      dataVencimento: `2026-0${n + 5}-10`,
      parcelamentoId: 'p1',
      parcelaAtual: n,
      totalParcelas: 3,
      status: n === 1 ? 'pago' : 'pendente',
    }));

    const julho = analisarFinancas(parcelas, '2026-07');
    const setembro = analisarFinancas(parcelas, '2026-09');

    expect(julho.parcelamentosAtivos[0]).toMatchObject({
      descricao: 'Celular',
      parcelaAtual: 2,
      totalParcelas: 3,
      valorRestante: 200,
    });
    expect(setembro.parcelamentosAtivos).toEqual([]);
  });

  it('counts an imported recurring commitment in every month without duplicating its dated instance', () => {
    const result = analisarFinancas([
      {
        tipo: 'despesa',
        descricao: 'Internet',
        valor: 120,
        origemRecorrenciaId: 'r1',
        recorrenciaImportada: true,
      },
      {
        tipo: 'despesa',
        descricao: 'Internet',
        valor: 120,
        origemRecorrenciaId: 'r1',
        dataVencimento: '2026-07-10',
      },
    ], '2026-07');

    expect(result.parcelamentosAtivos).toHaveLength(1);
    expect(result.parcelamentosAtivos[0]).toMatchObject({ tipo: 'recorrente', valorParcela: 120 });
  });

  it('handles a month without income without producing an invalid percentage', () => {
    const result = analisarFinancas([
      { tipo: 'despesa', valor: 'inválido', dataVencimento: '2026-07-01' },
    ], '2026-07');
    expect(result.percentualComprometido).toBeNull();
    expect(result.rendaMes).toBe(0);
    expect(result.despesaMes).toBe(0);
  });
});
