import { describe, expect, it } from 'vitest';
import {
  calcularOrcamentos,
  calcularPendencias,
  calcularPrevisao,
} from './planejamento.js';

describe('planejamento financeiro', () => {
  it('projects the balance chronologically and finds the first negative day', () => {
    const result = calcularPrevisao([
      { tipo: 'receita', valor: 1000, dataVencimento: '2026-07-05' },
      { tipo: 'despesa', valor: 600, dataVencimento: '2026-07-10' },
      { tipo: 'despesa', valor: 700, dataVencimento: '2026-07-20' },
    ], '2026-07', 100, '2026-07-12');

    expect(result).toMatchObject({
      saldoInicial: 100,
      receitasPrevistas: 1000,
      despesasPrevistas: 1300,
      saldoHojePrevisto: 500,
      saldoFinalPrevisto: -200,
      menorSaldoPrevisto: -200,
      dataSaldoNegativo: '2026-07-20',
    });
    expect(result.timeline).toHaveLength(3);
  });

  it('aggregates category budgets and signals attention and exceeded limits', () => {
    const categorias = [
      { id: 'alimentacao', nome: 'Alimentação', tipo: 'despesa' },
      { id: 'lazer', nome: 'Lazer', tipo: 'despesa' },
      { id: 'salario', nome: 'Salário', tipo: 'receita' },
    ];
    const result = calcularOrcamentos([
      { tipo: 'despesa', valor: 450, categoriaId: 'alimentacao', dataVencimento: '2026-07-01' },
      { tipo: 'despesa', valor: 250, categoriaId: 'lazer', dataVencimento: '2026-07-02' },
    ], categorias, { alimentacao: 500, lazer: 200 }, '2026-07');

    expect(result.find((item) => item.categoria.id === 'alimentacao')).toMatchObject({
      gasto: 450,
      restante: 50,
      percentual: 90,
      status: 'atencao',
    });
    expect(result.find((item) => item.categoria.id === 'lazer').status).toBe('excedido');
  });

  it('groups overdue, upcoming, uncategorized and ending installments', () => {
    const pending = calcularPendencias([
      {
        id: 'late',
        tipo: 'despesa',
        valor: 10,
        status: 'pendente',
        categoriaId: null,
        dataVencimento: '2026-07-01',
      },
      {
        id: 'income',
        tipo: 'receita',
        valor: 100,
        status: 'pendente',
        categoriaId: 'salario',
        dataVencimento: '2026-07-15',
      },
      {
        id: 'ending',
        tipo: 'despesa',
        valor: 50,
        status: 'pendente',
        categoriaId: 'compras',
        dataVencimento: '2026-07-16',
        parcelamentoId: 'p1',
        parcelaAtual: 5,
        totalParcelas: 6,
      },
      {
        id: 'paid',
        tipo: 'despesa',
        status: 'pago',
        dataVencimento: '2026-07-01',
      },
    ], [{ id: 'r1', ativo: true, categoriaId: null, valor: 20, diaVencimento: 10 }], '2026-07-10');

    expect(pending.atrasadas.map((item) => item.id)).toEqual(['late']);
    expect(pending.proximosVencimentos.map((item) => item.id)).toEqual(['income', 'ending']);
    expect(pending.receitasPendentes.map((item) => item.id)).toEqual(['income']);
    expect(pending.semCategoria.map((item) => item.id)).toEqual(['late', 'paid']);
    expect(pending.parcelamentosFinalizando.map((item) => item.id)).toEqual(['ending']);
    expect(pending.recorrenciasParaRevisar).toHaveLength(1);
  });
});
