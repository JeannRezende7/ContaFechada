import { describe, expect, it } from 'vitest';
import { computeInsights } from './insights.js';

describe('insights acionáveis', () => {
  it('explica aumento por categoria e oferece consulta relacionada', () => {
    const result = computeInsights({
      despesaPorCategoriaAtual: { food: 200 },
      despesaPorCategoriaAnterior: { food: 100 },
      categoriasById: { food: { nome: 'Alimentação' } },
      saldoMes: 100,
      diasRestantes: 10,
      diasNoMes: 30,
    });
    expect(result[0]).toMatchObject({ query: 'Alimentação' });
    expect(result[0].detail).toContain('R$');
  });
});
