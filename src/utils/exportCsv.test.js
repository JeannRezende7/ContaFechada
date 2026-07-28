import { describe, expect, it } from 'vitest';
import { buildCsv } from './exportCsv.js';

describe('buildCsv', () => {
  const columns = [
    { label: 'Descrição', value: (row) => row.descricao },
    { label: 'Valor', value: (row) => row.valor },
  ];

  it('builds a semicolon-separated CSV with a header', () => {
    expect(buildCsv([{ descricao: 'Mercado', valor: 10.5 }], columns))
      .toBe('Descrição;Valor\nMercado;10.5');
  });

  it('escapes separators, quotes, newlines and null values', () => {
    expect(buildCsv([
      { descricao: 'Loja; "Centro"\nPIX', valor: null },
    ], columns)).toBe('Descrição;Valor\n"Loja; ""Centro""\nPIX";');
  });
});
