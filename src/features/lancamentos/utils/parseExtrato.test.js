import { describe, expect, it } from 'vitest';
import { parseCsv, parseExtrato, parseMoney, parseOfx } from './parseExtrato.js';

describe('importação de extrato', () => {
  it('interpreta moeda brasileira', () => {
    expect(parseMoney('R$ 1.234,56')).toBe(1234.56);
  });

  it('interpreta CSV brasileiro com receitas e despesas', () => {
    const result = parseCsv('Data;Histórico;Valor\n01/07/2026;Mercado;-123,45\n02/07/2026;Salário;2500,00');
    expect(result).toEqual([
      { tipo: 'despesa', descricao: 'Mercado', valor: 123.45, dataVencimento: '2026-07-01' },
      { tipo: 'receita', descricao: 'Salário', valor: 2500, dataVencimento: '2026-07-02' },
    ]);
  });

  it('interpreta transações OFX', () => {
    const result = parseOfx('<STMTTRN><DTPOSTED>20260703<TRNAMT>-45.90<NAME>Padaria</STMTTRN>');
    expect(result[0]).toMatchObject({ tipo: 'despesa', valor: 45.9, descricao: 'Padaria', dataVencimento: '2026-07-03' });
  });

  it('separa linhas inválidas no relatório', () => {
    const result = parseExtrato('Data;Descrição;Valor\nx;Inválido;12\n01/07/2026;OK;-5', 'csv');
    expect(result.items).toHaveLength(1);
    expect(result.errors).toEqual(['Linha 2 inválida.']);
  });
});
