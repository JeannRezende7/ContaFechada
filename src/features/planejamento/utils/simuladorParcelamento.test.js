import { describe, expect, it } from 'vitest';
import { compararParcelamentos, simularParcelamento } from './simuladorParcelamento.js';

describe('simulador de parcelamento', () => {
  it('considera entrada e divide o restante', () => {
    const result = simularParcelamento({ valor: 1000, entrada: 100, parcelas: 3, monthKey: '2026-07', saldoInicial: 500 });
    expect(result.valorParcela).toBe(300);
    expect(result.movements).toHaveLength(4);
  });

  it('compara três quantidades sem repetir parcela mínima', () => {
    expect(compararParcelamentos({ valor: 100, parcelas: 1, monthKey: '2026-07' }).map((item) => item.parcelas))
      .toEqual([1, 3]);
  });
});
