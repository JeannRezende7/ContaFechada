import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/deviceId.js', () => ({ getDeviceId: () => 'device-1' }));

import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from '../migrations/index.js';
import { enqueue } from './syncQueue.js';
import { runSyncCycle } from './runSyncCycle.js';
import { getSyncHealth } from './syncHealth.js';

describe('getSyncHealth', () => {
  let driver;

  beforeEach(async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
  });

  afterEach(() => {
    driver.close();
  });

  it('reports zero pending, no conflicts and no sync yet on a fresh database', async () => {
    const health = await getSyncHealth({ driver, entidades: ['categorias', 'lancamentos'] });

    expect(health).toEqual({
      filaPendente: 0,
      conflitosRecentes: [],
      ultimaSincronizacaoPorEntidade: { categorias: null, lancamentos: null },
    });
  });

  it('reflects queued operations and logged conflicts', async () => {
    const farFuture = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const fetchChangedSince = vi.fn().mockImplementation((entidade) =>
      Promise.resolve(
        entidade === 'lancamentos'
          ? [{ id: 'remote-1', tipo: 'despesa', descricao: 'x', valor: 1, dataVencimento: '2026-07-01', status: 'pago', updatedAt: farFuture }]
          : []
      )
    );

    // Runs a full sync cycle first (with an empty queue) so it records a
    // last-sync timestamp for both entities and logs the clock-skew conflict.
    await runSyncCycle({
      driver,
      uid: 'u1',
      uploader: { upsert: vi.fn().mockResolvedValue(), remove: vi.fn() },
      entidades: ['categorias', 'lancamentos'],
      isPremium: true,
      isOnline: true,
      fetchChangedSince,
    });

    // Queued after the cycle above, so these stay pending for the health check.
    await enqueue(driver, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: {} });
    await enqueue(driver, { entidade: 'categorias', registroId: 'c1', operacao: 'create', payload: {} });

    const health = await getSyncHealth({ driver, entidades: ['categorias', 'lancamentos'] });

    expect(health.filaPendente).toBe(2);
    expect(health.conflitosRecentes).toHaveLength(1);
    expect(health.conflitosRecentes[0]).toMatchObject({ entidade: 'lancamentos', motivo: 'relogio_incorreto' });
    // Both entities went through the sync cycle above, so both get a
    // last-sync timestamp — even categorias, which had nothing to apply.
    expect(health.ultimaSincronizacaoPorEntidade.lancamentos).not.toBeNull();
    expect(health.ultimaSincronizacaoPorEntidade.categorias).not.toBeNull();
  });
});
