import { describe, expect, it } from 'vitest';
import { calcularFechamento, construirAdiamentoPendencias } from './fechamento.js';

describe('fechamento mensal', () => {
  it('considera apenas valores realizados no saldo', () => {
    const result = calcularFechamento([
      { id: '1', tipo: 'receita', valor: 100, status: 'recebido', dataVencimento: '2026-07-02' },
      { id: '2', tipo: 'despesa', valor: 30, status: 'pago', dataVencimento: '2026-07-03' },
      { id: '3', tipo: 'despesa', valor: 20, status: 'pendente', dataVencimento: '2026-07-04' },
    ], '2026-07', 10);
    expect(result).toMatchObject({ receitas: 100, despesas: 30, saldoCalculado: 80 });
    expect(result.pendentes).toHaveLength(1);
  });

  it('move pendência preservando o dia possível', () => {
    expect(construirAdiamentoPendencias([{ id: 'x', dataVencimento: '2026-01-31' }], '2026-01'))
      .toEqual({ x: { dataVencimento: '2026-02-28' } });
  });
});
