import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/deviceId.js', () => ({ getDeviceId: () => 'device-1' }));

import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from '../migrations/index.js';
import { enqueue } from './syncQueue.js';
import { getLastSyncAt, runSyncCycle } from './runSyncCycle.js';

describe('runSyncCycle', () => {
  let driver;

  beforeEach(async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
  });

  afterEach(() => {
    driver.close();
  });

  it('skips the whole cycle without touching anything when not Premium', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: {} });
    const uploader = { upsert: vi.fn(), remove: vi.fn() };

    const result = await runSyncCycle({
      driver,
      uid: 'u1',
      uploader,
      entidades: ['lancamentos'],
      isPremium: false,
      isOnline: true,
    });

    expect(result).toEqual({ skipped: true, reason: 'sem_premium' });
    expect(uploader.upsert).not.toHaveBeenCalled();
    expect(await getLastSyncAt(driver, 'lancamentos')).toBeNull();
  });

  it('skips with reason offline when there is no connection, even with Premium', async () => {
    const result = await runSyncCycle({
      driver,
      uid: 'u1',
      uploader: { upsert: vi.fn(), remove: vi.fn() },
      entidades: ['lancamentos'],
      isPremium: true,
      isOnline: false,
    });

    expect(result).toEqual({ skipped: true, reason: 'offline' });
  });

  it('downloads and uploads for each entity, then records the sync time, when allowed', async () => {
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: { valor: 10 } });
    const uploader = { upsert: vi.fn().mockResolvedValue(), remove: vi.fn().mockResolvedValue() };
    const fetchChangedSince = vi.fn().mockResolvedValue([]);

    const result = await runSyncCycle({
      driver,
      uid: 'u1',
      uploader,
      entidades: ['categorias', 'lancamentos'],
      isPremium: true,
      isOnline: true,
      fetchChangedSince,
    });

    expect(result.skipped).toBe(false);
    expect(result.upload).toEqual({ processed: 1, succeeded: 1, failed: 0, bytesUploaded: 12 });
    expect(result.metrics).toMatchObject({ cycles: 1, bytesUploaded: 12, errors: 0 });
    expect(uploader.upsert).toHaveBeenCalledWith('lancamentos', 'l1', { valor: 10 });
    expect(await getLastSyncAt(driver, 'categorias')).not.toBeNull();
    expect(await getLastSyncAt(driver, 'lancamentos')).not.toBeNull();
  });
});
