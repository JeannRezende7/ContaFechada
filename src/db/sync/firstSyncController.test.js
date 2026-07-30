import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from '../migrations/index.js';
import { createFirstSyncController } from './firstSyncController.js';

describe('first sync controller', () => {
  let driver;
  beforeEach(async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
  });
  afterEach(() => driver.close());

  function controller(overrides = {}) {
    return createFirstSyncController({
      driver,
      uid: 'u1',
      previewFirstSync: vi.fn().mockResolvedValue({ lancamentos: { local: 1, remoto: 2 } }),
      createBackup: vi.fn().mockResolvedValue({ persisted: true, reference: 'backup.json' }),
      upload: vi.fn().mockResolvedValue({ uploaded: 1 }),
      download: vi.fn().mockResolvedValue({ downloaded: 2 }),
      merge: vi.fn().mockResolvedValue({ merged: 3 }),
      ...overrides,
    });
  }

  it('persists preview and completes the selected operation', async () => {
    const c = controller();
    expect((await c.prepare()).status).toBe('awaiting_choice');
    const completed = await c.execute('merge');
    expect(completed).toMatchObject({ status: 'completed', choice: 'merge', result: { merged: 3 } });
    expect((await c.getState()).backup).toBe('backup.json');
  });

  it('never starts without a confirmed backup', async () => {
    const merge = vi.fn();
    const c = controller({ createBackup: vi.fn().mockResolvedValue({ persisted: false }), merge });
    await expect(c.execute('merge')).rejects.toThrow('backup');
    expect(merge).not.toHaveBeenCalled();
    expect(await c.getState()).toMatchObject({ status: 'error', choice: 'merge' });
  });

  it('resumes an interrupted idempotent operation from persisted state', async () => {
    const upload = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ uploaded: 1 });
    const c = controller({ upload });
    await expect(c.execute('upload')).rejects.toThrow('offline');
    const resumed = await c.resume();
    expect(resumed.status).toBe('completed');
    expect(upload).toHaveBeenCalledTimes(2);
  });
});
