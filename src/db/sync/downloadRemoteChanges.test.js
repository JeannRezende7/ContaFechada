import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/deviceId.js', () => ({ getDeviceId: () => 'device-1' }));

import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from '../migrations/index.js';
import { downloadRemoteChanges, getCursor, listConflictLog } from './downloadRemoteChanges.js';

const BASE = { tipo: 'despesa', descricao: 'Feira', valor: 50, dataVencimento: '2026-07-10', status: 'pago' };

describe('downloadRemoteChanges', () => {
  let driver;

  beforeEach(async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
  });

  afterEach(() => {
    driver.close();
  });

  it('applies remote items to an empty local database and advances the cursor', async () => {
    const fetchChangedSince = vi.fn().mockResolvedValue([
      { ...BASE, id: 'l1', updatedAt: '2026-07-10T10:00:00.000Z' },
      { ...BASE, id: 'l2', descricao: 'Salário', updatedAt: '2026-07-11T10:00:00.000Z' },
    ]);

    const result = await downloadRemoteChanges({ driver, uid: 'u1', entidade: 'lancamentos', fetchChangedSince });

    expect(result).toMatchObject({ applied: 2, conflicts: [], cursor: '2026-07-11T10:00:00.000Z' });
    expect(result.bytesDownloaded).toBeGreaterThan(0);
    expect(await getCursor(driver, 'lancamentos')).toBe('2026-07-11T10:00:00.000Z');
    expect(await driver.get('SELECT * FROM lancamentos WHERE id = ?', ['l1'])).toMatchObject({ descricao: 'Feira' });
  });

  it('passes the current cursor to the fetcher on the next call, so only newer changes are requested', async () => {
    const fetchChangedSince = vi.fn().mockResolvedValue([{ ...BASE, id: 'l1', updatedAt: '2026-07-10T10:00:00.000Z' }]);
    await downloadRemoteChanges({ driver, uid: 'u1', entidade: 'lancamentos', fetchChangedSince });

    fetchChangedSince.mockResolvedValueOnce([]);
    await downloadRemoteChanges({ driver, uid: 'u1', entidade: 'lancamentos', fetchChangedSince });

    expect(fetchChangedSince).toHaveBeenLastCalledWith('lancamentos', '2026-07-10T10:00:00.000Z');
  });

  it('last-write-wins: a newer local edit is kept over an older remote change, and the conflict is logged', async () => {
    const fetchChangedSince = vi.fn().mockResolvedValue([{ ...BASE, id: 'l1', descricao: 'Da nuvem', updatedAt: '2026-07-10T10:00:00.000Z' }]);
    await downloadRemoteChanges({ driver, uid: 'u1', entidade: 'lancamentos', fetchChangedSince });

    // Simulate a local edit made after the remote snapshot above.
    await driver.run("UPDATE lancamentos SET descricao = 'Editado aqui', updated_at = ? WHERE id = ?", [
      '2026-07-12T00:00:00.000Z',
      'l1',
    ]);

    fetchChangedSince.mockResolvedValueOnce([{ ...BASE, id: 'l1', descricao: 'Da nuvem de novo', updatedAt: '2026-07-11T00:00:00.000Z' }]);
    const result = await downloadRemoteChanges({ driver, uid: 'u1', entidade: 'lancamentos', fetchChangedSince });

    expect(result.applied).toBe(0);
    expect(result.conflicts).toEqual([{ id: 'l1', motivo: 'local_mais_novo', local: '2026-07-12T00:00:00.000Z', remoto: '2026-07-11T00:00:00.000Z' }]);

    const row = await driver.get('SELECT * FROM lancamentos WHERE id = ?', ['l1']);
    expect(row.descricao).toBe('Editado aqui');

    const log = await listConflictLog(driver, { entidade: 'lancamentos' });
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ registroId: 'l1', motivo: 'local_mais_novo' });
  });

  it('flags a remote updatedAt far in the future as a clock-skew conflict instead of applying it', async () => {
    const farFuture = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h ahead
    const fetchChangedSince = vi.fn().mockResolvedValue([{ ...BASE, id: 'l1', updatedAt: farFuture }]);

    const result = await downloadRemoteChanges({
      driver,
      uid: 'u1',
      entidade: 'lancamentos',
      fetchChangedSince,
      maxClockSkewMs: 5 * 60 * 1000, // 5 min tolerance
    });

    expect(result.applied).toBe(0);
    expect(result.conflicts).toEqual([{ id: 'l1', motivo: 'relogio_incorreto', updatedAt: farFuture }]);
    expect(await driver.get('SELECT * FROM lancamentos WHERE id = ?', ['l1'])).toBeNull();
  });

  it('applies a remote tombstone without physically removing the local row', async () => {
    const updatedAt = '2026-07-10T10:00:00.000Z';
    const deletedAt = '2026-07-10T09:59:00.000Z';
    const fetchChangedSince = vi.fn().mockResolvedValue([{ ...BASE, id: 'l1', updatedAt, deletedAt }]);

    const result = await downloadRemoteChanges({ driver, uid: 'u1', entidade: 'lancamentos', fetchChangedSince });

    expect(result.applied).toBe(1);
    const row = await driver.get('SELECT * FROM lancamentos WHERE id = ?', ['l1']);
    expect(row.deleted_at).toBe(deletedAt);
  });

  it('applies incremental changes to any local_documents domain', async () => {
    const fetchChangedSince = vi.fn().mockResolvedValue([{
      id: 'm1',
      nome: 'Meta remota',
      valorAlvo: 500,
      updatedAt: '2026-07-10T10:00:00.000Z',
      createdAt: '2026-07-01T10:00:00.000Z',
    }]);
    const result = await downloadRemoteChanges({
      driver,
      uid: 'u1',
      entidade: 'metas',
      storage: 'documents',
      fetchChangedSince,
    });

    expect(result.applied).toBe(1);
    const row = await driver.get(
      'SELECT * FROM local_documents WHERE dominio=? AND id=?',
      ['metas', 'm1']
    );
    expect(JSON.parse(row.dados)).toMatchObject({ nome: 'Meta remota', valorAlvo: 500 });
    expect(row.sync_status).toBe('synced');
  });
});
