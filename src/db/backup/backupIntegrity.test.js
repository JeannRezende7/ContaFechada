import { describe, expect, it } from 'vitest';
import { assertBackupEquivalent, summarizeBackup } from './backupIntegrity.js';

describe('backup integrity', () => {
  const snapshot = {
    categorias: [{ id: 'c1' }],
    recorrencias: [{ id: 'r1' }],
    lancamentos: [
      { id: 'l1', tipo: 'receita', valor: 10.1 },
      { id: 'l2', tipo: 'despesa', valor: '20.20' },
    ],
  };

  it('summarizes domain counts and the financial total', () => {
    expect(summarizeBackup(snapshot)).toEqual({
      records: 4,
      financialTotal: 30.3,
      incomeTotal: 10.1,
      expenseTotal: 20.2,
      balance: -10.1,
      domains: {
        categorias: { count: 1, valueTotal: null },
        lancamentos: { count: 2, valueTotal: 30.3 },
        recorrencias: { count: 1, valueTotal: null },
      },
    });
  });

  it('accepts an equivalent round trip independent of object field order', () => {
    expect(assertBackupEquivalent(snapshot, JSON.parse(JSON.stringify(snapshot))).records).toBe(4);
  });

  it('blocks a restore with missing or financially changed records', () => {
    expect(() => assertBackupEquivalent(snapshot, { ...snapshot, lancamentos: [snapshot.lancamentos[0]] }))
      .toThrow('Nenhum dado foi substituido');
    expect(() => assertBackupEquivalent(snapshot, { ...snapshot, lancamentos: [{ id: 'l1', valor: 99 }, snapshot.lancamentos[1]] }))
      .toThrow('divergencia');
  });
});
