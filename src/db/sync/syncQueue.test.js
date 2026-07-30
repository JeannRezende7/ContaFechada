import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from '../migrations/index.js';
import {
  countPending,
  enqueue,
  listPending,
  markFailed,
  markSynced,
  markSyncing,
  retryFailed,
} from './syncQueue.js';

describe('syncQueue', () => {
  let driver;

  beforeEach(async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
  });

  afterEach(() => {
    driver.close();
  });

  it('enqueues a new operation and lists it as pending', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: { valor: 10 } });

    const pending = await listPending(driver);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: { valor: 10 } });
    expect(await countPending(driver)).toBe(1);
  });

  it('consolidates create+update into a single create with the newest payload', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: { valor: 10 } });
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'update', payload: { valor: 20 } });

    const pending = await listPending(driver);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ operacao: 'create', payload: { valor: 20 } });
  });

  it('consolidates create+delete by dropping the entry entirely', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: { valor: 10 } });
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'delete' });

    expect(await listPending(driver)).toHaveLength(0);
  });

  it('consolidates update+update into a single update with the newest payload', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'update', payload: { status: 'pago' } });
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'update', payload: { status: 'atrasado' } });

    const pending = await listPending(driver);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ operacao: 'update', payload: { status: 'atrasado' } });
  });

  it('consolidates update+delete into delete', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'update', payload: { status: 'pago' } });
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'delete' });

    const pending = await listPending(driver);
    expect(pending).toHaveLength(1);
    expect(pending[0].operacao).toBe('delete');
  });

  it('does not consolidate against an entry already syncing — a newer change becomes its own queued entry', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'update', payload: { status: 'pago' } });
    const [inFlight] = await listPending(driver);
    await markSyncing(driver, inFlight.id);

    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'update', payload: { status: 'atrasado' } });

    expect(await countPending(driver)).toBe(2);
  });

  it('markSynced dequeues the operation only after confirmation', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: {} });
    const [op] = await listPending(driver);

    await markSynced(driver, op.id);

    expect(await countPending(driver)).toBe(0);
  });

  it('markFailed schedules a future retry with progressive backoff and keeps status pending', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: {} });
    const [op] = await listPending(driver);

    await markFailed(driver, op.id, new Error('offline'));

    const row = await driver.get('SELECT * FROM sync_queue WHERE id = ?', [op.id]);
    expect(row.status).toBe('pending');
    expect(row.tentativas).toBe(1);
    expect(row.erro).toBe('offline');
    expect(new Date(row.proxima_tentativa_em).getTime()).toBeGreaterThan(Date.now());

    // Still scheduled in the future, so it's not picked up again yet.
    expect(await listPending(driver)).toHaveLength(0);
  });

  it('marks an operation as permanently errored after the max retry attempts', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: {} });
    const [op] = await listPending(driver);

    for (let i = 0; i < 8; i++) {
      await markFailed(driver, op.id, new Error('offline'));
    }

    const row = await driver.get('SELECT * FROM sync_queue WHERE id = ?', [op.id]);
    expect(row.status).toBe('error');
    expect(row.tentativas).toBe(8);

    await retryFailed(driver, op.id);
    const retried = await driver.get('SELECT * FROM sync_queue WHERE id = ?', [op.id]);
    expect(retried.status).toBe('pending');
  });

  it('lists pending operations oldest first', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: {} });
    vi.setSystemTime(new Date('2026-07-02T00:00:00Z'));
    await enqueue(driver, { entidade: 'categorias', registroId: 'c1', operacao: 'create', payload: {} });
    vi.useRealTimers();

    const pending = await listPending(driver);
    expect(pending.map((p) => p.entidade)).toEqual(['lancamentos', 'categorias']);
  });
});
