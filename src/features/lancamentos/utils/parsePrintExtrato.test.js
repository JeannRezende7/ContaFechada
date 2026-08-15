import { describe, expect, it } from 'vitest';
import { parsePrintExtrato } from './parsePrintExtrato.js';

describe('parsePrintExtrato', () => {
  it('extracts editable transaction fields from common OCR layouts', () => {
    const result = parsePrintExtrato(`
      12/08/2026 Padaria Central - R$ 24,90
      13/08
      PIX MARIA
      + 1.250,00
      Saldo disponível R$ 3.000,00
    `, 'receita', '2026-08-15');

    expect(result).toEqual([
      { tipo: 'receita', descricao: 'Padaria Central', valor: 24.9, dataVencimento: '2026-08-12' },
      { tipo: 'receita', descricao: 'PIX MARIA', valor: 1250, dataVencimento: '2026-08-13' },
    ]);
  });

  it('uses the reference date when OCR does not find a date', () => {
    expect(parsePrintExtrato('SUPERMERCADO R$ 87,42', 'despesa', '2026-08-15')[0]).toMatchObject({
      tipo: 'despesa',
      descricao: 'SUPERMERCADO',
      valor: 87.42,
      dataVencimento: '2026-08-15',
    });
  });
});
