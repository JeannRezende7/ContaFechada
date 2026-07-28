import { describe, expect, it } from 'vitest';
import { extractFaturaContext, parseNubankTransacoes } from './parseFaturaNubank.js';

describe('parseFaturaNubank', () => {
  it('extracts the bill due-date context', () => {
    expect(extractFaturaContext(['Data de vencimento: 10 JUL 2026'])).toEqual({
      diaVenc: 10,
      mesVenc: 7,
      anoVenc: 2026,
    });
    expect(extractFaturaContext(['sem data'])).toBeNull();
  });

  it('parses purchases, installments and ignores the bill payment line', () => {
    const context = { diaVenc: 10, mesVenc: 7, anoVenc: 2026 };
    const result = parseNubankTransacoes([
      '03 JUN Mercado R$ 123,45',
      '04 JUN Curso - Parcela 2/10 R$ 49,90',
      '05 JUN Pagamento em 05 JUN -R$ 1.000,00',
    ], context);

    expect(result).toEqual([
      {
        dataVencimento: '2026-06-03',
        descricao: 'Mercado',
        valor: 123.45,
        tipo: 'despesa',
        parcelaAtual: null,
        totalParcelas: null,
      },
      {
        dataVencimento: '2026-06-04',
        descricao: 'Curso',
        valor: 49.9,
        tipo: 'despesa',
        parcelaAtual: 2,
        totalParcelas: 10,
      },
    ]);
  });

  it('handles multiline refunds and December-to-January year rollover', () => {
    const result = parseNubankTransacoes([
      '17 DEZ Estorno de "Loja Online"',
      'detalhes da compra',
      '-R$ 39,19',
    ], { diaVenc: 10, mesVenc: 1, anoVenc: 2027 });

    expect(result).toEqual([{
      dataVencimento: '2026-12-17',
      descricao: 'Estorno: Loja Online',
      valor: 39.19,
      tipo: 'receita',
      parcelaAtual: null,
      totalParcelas: null,
    }]);
  });
});
