import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/deviceId.js', () => ({ getDeviceId: () => 'device-1' }));

import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from '../migrations/index.js';
import {
  MigrationValidationError,
  getFirestoreMigrationState,
  migrateFromFirestore,
} from './migrateFromFirestore.js';

/** Mimics a Firestore Timestamp — real docs carry one, legacy pre-Fase-2 docs may not. */
function fakeTimestamp(isoString) {
  return { toDate: () => new Date(isoString) };
}

function makeFirebaseRepositories({ categorias = [], lancamentos = [] } = {}) {
  return {
    categorias: { list: vi.fn().mockResolvedValue(categorias) },
    lancamentos: { listAll: vi.fn().mockResolvedValue(lancamentos) },
  };
}

describe('migrateFromFirestore', () => {
  let driver;

  beforeEach(async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
  });

  afterEach(() => {
    driver.close();
  });

  it('copies categorias and lançamentos into SQLite, preserving the Firestore id', async () => {
    const firebaseRepositories = makeFirebaseRepositories({
      categorias: [
        { id: 'cat-1', nome: 'Mercado', tipo: 'despesa', corKey: 'azul', icone: 'shoppingBasket', padrao: true, ordem: 1, createdAt: fakeTimestamp('2026-01-01T00:00:00Z'), updatedAt: fakeTimestamp('2026-01-01T00:00:00Z') },
      ],
      lancamentos: [
        { id: 'lan-1', tipo: 'despesa', descricao: 'Feira', valor: 50, dataVencimento: '2026-07-10', status: 'pago', createdAt: fakeTimestamp('2026-07-01T00:00:00Z'), updatedAt: fakeTimestamp('2026-07-01T00:00:00Z') },
        { id: 'lan-2', tipo: 'receita', descricao: 'Salário', valor: 3000, dataVencimento: '2026-07-05', status: 'recebido', createdAt: fakeTimestamp('2026-07-01T00:00:00Z'), updatedAt: fakeTimestamp('2026-07-01T00:00:00Z') },
      ],
    });

    const result = await migrateFromFirestore({ driver, uid: 'u1', firebaseRepositories });

    expect(result.skipped).toBe(false);
    expect(result.summary).toEqual({
      categorias: { count: 1, sum: null },
      lancamentos: { count: 2, sum: 3050 },
    });

    const categoriaRow = await driver.get('SELECT * FROM categorias WHERE id = ?', ['cat-1']);
    expect(categoriaRow).toMatchObject({ id: 'cat-1', nome: 'Mercado', sync_status: 'synced', created_at: '2026-01-01T00:00:00.000Z' });

    const lancamentoRow = await driver.get('SELECT * FROM lancamentos WHERE id = ?', ['lan-1']);
    expect(lancamentoRow).toMatchObject({ id: 'lan-1', descricao: 'Feira', valor: 50, sync_status: 'synced' });
  });

  it('records completion so a second call skips by default', async () => {
    const firebaseRepositories = makeFirebaseRepositories({
      categorias: [{ id: 'cat-1', nome: 'Mercado', tipo: 'despesa', corKey: 'azul', icone: 'x', padrao: true, ordem: 1, createdAt: fakeTimestamp('2026-01-01T00:00:00Z'), updatedAt: fakeTimestamp('2026-01-01T00:00:00Z') }],
    });

    const first = await migrateFromFirestore({ driver, uid: 'u1', firebaseRepositories });
    expect(first.skipped).toBe(false);
    expect(await getFirestoreMigrationState(driver)).toMatchObject({ version: 1 });

    const second = await migrateFromFirestore({ driver, uid: 'u1', firebaseRepositories });
    expect(second.skipped).toBe(true);
    expect(firebaseRepositories.categorias.list).toHaveBeenCalledTimes(1);
  });

  it('is idempotent under --force: re-running never duplicates rows, only re-writes the same ids', async () => {
    const firebaseRepositories = makeFirebaseRepositories({
      lancamentos: [{ id: 'lan-1', tipo: 'despesa', descricao: 'Feira', valor: 50, dataVencimento: '2026-07-10', status: 'pago', createdAt: fakeTimestamp('2026-07-01T00:00:00Z'), updatedAt: fakeTimestamp('2026-07-01T00:00:00Z') }],
    });

    await migrateFromFirestore({ driver, uid: 'u1', firebaseRepositories });
    await migrateFromFirestore({ driver, uid: 'u1', firebaseRepositories, force: true });

    const rows = await driver.all('SELECT * FROM lancamentos');
    expect(rows).toHaveLength(1);
  });

  it('throws and does not mark completion when origin and destination counts diverge', async () => {
    // Two distinct Firestore docs sharing one id is not supposed to happen,
    // but it is exactly the shape of bug this validation exists to catch:
    // INSERT OR REPLACE collapses them to one SQLite row, so the destination
    // count (1) diverges from the fetched origin count (2).
    const firebaseRepositories = makeFirebaseRepositories({
      lancamentos: [
        { id: 'dup-1', tipo: 'despesa', descricao: 'A', valor: 10, dataVencimento: '2026-07-10', status: 'pago' },
        { id: 'dup-1', tipo: 'despesa', descricao: 'B', valor: 20, dataVencimento: '2026-07-11', status: 'pago' },
      ],
    });

    await expect(migrateFromFirestore({ driver, uid: 'u1', firebaseRepositories })).rejects.toThrow(MigrationValidationError);
    expect(await getFirestoreMigrationState(driver)).toBeNull();
    expect(await driver.all('SELECT * FROM lancamentos')).toEqual([]);
  });

  it('does not write anything when fetching one of the domains fails', async () => {
    const firebaseRepositories = makeFirebaseRepositories({
      categorias: [{ id: 'cat-1', nome: 'Mercado', tipo: 'despesa' }],
    });
    firebaseRepositories.lancamentos.listAll.mockRejectedValue(new Error('network'));
    await expect(migrateFromFirestore({ driver, uid: 'u1', firebaseRepositories })).rejects.toThrow('network');
    expect(await driver.all('SELECT * FROM categorias')).toEqual([]);
    expect(await getFirestoreMigrationState(driver)).toBeNull();
  });
});
