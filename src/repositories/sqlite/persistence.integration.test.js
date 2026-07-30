import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteDriver } from '../../db/drivers/nodeSqliteDriver.js';
import { migrations } from '../../db/migrations/index.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { createSqliteRepositories } from './repositories.js';

describe('persistência SQLite após reinicialização e offline', () => {
  const filename = join(tmpdir(), `contafechada-${process.pid}.sqlite`);

  afterEach(() => {
    if (existsSync(filename)) rmSync(filename);
    vi.unstubAllGlobals();
  });

  it('reabre o arquivo sem rede, preservando dados, tombstone e fila', async () => {
    vi.stubGlobal('localStorage', { getItem: () => 'offline-device', setItem: vi.fn() });
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));

    let driver = createNodeSqliteDriver(filename);
    await runMigrations(driver, migrations);
    let repositories = createSqliteRepositories(driver);
    const keptId = await repositories.regrasCategorizacao.create('local', {
      termo: 'mercado', tipo: 'despesa', categoriaId: 'alimentacao', ativa: true,
    });
    const removedId = await repositories.metas.create('local', {
      nome: 'Temporária', valorAlvo: 10, corKey: 'verde',
    });
    await driver.run("UPDATE local_documents SET sync_status='synced' WHERE dominio='metas' AND id=?", [removedId]);
    await driver.run("DELETE FROM sync_queue WHERE entidade='metas' AND registro_id=?", [removedId]);
    await repositories.metas.remove('local', removedId);
    driver.close();

    driver = createNodeSqliteDriver(filename);
    expect(await runMigrations(driver, migrations)).toEqual([]);
    repositories = createSqliteRepositories(driver);
    expect(await repositories.regrasCategorizacao.list('local')).toEqual([
      expect.objectContaining({ id: keptId, termo: 'mercado' }),
    ]);
    expect((await driver.get(
      'SELECT deleted_at FROM local_documents WHERE dominio=? AND id=?',
      ['metas', removedId]
    )).deleted_at).toBeTruthy();
    expect((await driver.get('SELECT COUNT(*) AS count FROM sync_queue')).count).toBe(2);
    expect(fetch).not.toHaveBeenCalled();
    driver.close();
  });
});
