import { describe, expect, it } from 'vitest';
import { assertBackupEquivalent, summarizeBackup } from './backupIntegrity.js';

describe('backup integrity', () => {
  const snapshot = {
    categorias: [{ id: 'c1' }],
    lancamentos: [{ id: 'l1', valor: 10.1 }, { id: 'l2', valor: '20.20' }],
  };

  it('summarizes domain counts and the financial total', () => {
    expect(summarizeBackup(snapshot)).toEqual({
      records: 3,
      financialTotal: 30.3,
      domains: { categorias: { count: 1, valueTotal: null }, lancamentos: { count: 2, valueTotal: 30.3 } },
    });
  });

  it('accepts an equivalent round trip independent of object field order', () => {
    expect(assertBackupEquivalent(snapshot, JSON.parse(JSON.stringify(snapshot))).records).toBe(3);
  });

  it('blocks a restore with missing or financially changed records', () => {
    expect(() => assertBackupEquivalent(snapshot, { ...snapshot, lancamentos: [snapshot.lancamentos[0]] }))
      .toThrow('Nenhum dado foi substituido');
    expect(() => assertBackupEquivalent(snapshot, { ...snapshot, lancamentos: [{ id: 'l1', valor: 99 }, snapshot.lancamentos[1]] }))
      .toThrow('divergencia');
  });
});
