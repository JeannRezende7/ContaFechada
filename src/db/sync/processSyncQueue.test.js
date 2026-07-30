import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from '../migrations/index.js';
import { enqueue, countPending, listPending } from './syncQueue.js';
import { processSyncQueue } from './processSyncQueue.js';

describe('processSyncQueue', () => {
  let driver;

  beforeEach(async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
  });

  afterEach(() => {
    driver.close();
  });

  it('upserts create/update operations and dequeues them on success', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: { valor: 10 } });
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l2', operacao: 'update', payload: { valor: 20 } });
    const uploader = { upsert: vi.fn().mockResolvedValue(), remove: vi.fn().mockResolvedValue() };

    const result = await processSyncQueue({ driver, uploader });

    expect(result).toEqual({ processed: 2, succeeded: 2, failed: 0, bytesUploaded: 24 });
    expect(uploader.upsert).toHaveBeenCalledWith('lancamentos', 'l1', { valor: 10 });
    expect(uploader.upsert).toHaveBeenCalledWith('lancamentos', 'l2', { valor: 20 });
    expect(await countPending(driver)).toBe(0);
  });

  it('calls remove for delete operations', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'delete' });
    const uploader = { upsert: vi.fn(), remove: vi.fn().mockResolvedValue() };

    await processSyncQueue({ driver, uploader });

    expect(uploader.remove).toHaveBeenCalledWith('lancamentos', 'l1');
    expect(uploader.upsert).not.toHaveBeenCalled();
  });

  it('keeps a failed operation in the queue for a later retry instead of losing it', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: {} });
    const uploader = { upsert: vi.fn().mockRejectedValue(new Error('offline')), remove: vi.fn() };

    const result = await processSyncQueue({ driver, uploader });

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1, bytesUploaded: 0 });
    expect(await countPending(driver)).toBe(1);
    const [op] = await driver.all('SELECT * FROM sync_queue');
    expect(op.status).toBe('pending');
    expect(op.tentativas).toBe(1);
  });

  it('only processes up to batchSize operations per call', async () => {
    for (let i = 0; i < 5; i++) {
      await enqueue(driver, { entidade: 'lancamentos', registroId: `l${i}`, operacao: 'create', payload: {} });
    }
    const uploader = { upsert: vi.fn().mockResolvedValue(), remove: vi.fn() };

    const result = await processSyncQueue({ driver, uploader, batchSize: 2 });

    expect(result).toEqual({ processed: 2, succeeded: 2, failed: 0, bytesUploaded: 4 });
    expect(await countPending(driver)).toBe(3);
  });

  it('does not retry a failed operation immediately within the same call — respects the backoff window', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: {} });
    const uploader = { upsert: vi.fn().mockRejectedValue(new Error('offline')), remove: vi.fn() };

    await processSyncQueue({ driver, uploader });
    expect(await listPending(driver)).toHaveLength(0);

    const secondCall = await processSyncQueue({ driver, uploader });
    expect(secondCall.processed).toBe(0);
  });

  it('marks local documents as synced and purges confirmed tombstones', async () => {
    const now = new Date().toISOString();
    await driver.run(
      `INSERT INTO local_documents
       (dominio,id,dados,created_at,updated_at,deleted_at,device_id,sync_status,local_version)
       VALUES ('metas','m1','{}',?,?,NULL,'d1','pending',1),
              ('metas','m2','{}',?,?,?,'d1','pending',2)`,
      [now, now, now, now, now]
    );
    await enqueue(driver, { entidade: 'metas', registroId: 'm1', operacao: 'update', payload: {} });
    await enqueue(driver, { entidade: 'metas', registroId: 'm2', operacao: 'delete' });
    const uploader = { upsert: vi.fn().mockResolvedValue(), remove: vi.fn().mockResolvedValue() };

    await processSyncQueue({ driver, uploader });

    expect((await driver.get(
      'SELECT sync_status FROM local_documents WHERE dominio=? AND id=?',
      ['metas', 'm1']
    )).sync_status).toBe('synced');
    expect(await driver.get(
      'SELECT id FROM local_documents WHERE dominio=? AND id=?',
      ['metas', 'm2']
    )).toBeNull();
  });
});
