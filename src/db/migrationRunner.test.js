import { afterEach, describe, expect, it } from 'vitest';
import { createNodeSqliteDriver } from './drivers/nodeSqliteDriver.js';
import { getSchemaVersion, runMigrations } from './migrationRunner.js';
import { migrations } from './migrations/index.js';

describe('migrationRunner', () => {
  let driver;

  afterEach(() => {
    driver?.close();
  });

  it('starts at version 0 on a fresh database', async () => {
    driver = createNodeSqliteDriver();
    expect(await getSchemaVersion(driver)).toBe(0);
  });

  it('applies every pending migration and reports the versions applied', async () => {
    driver = createNodeSqliteDriver();
    const applied = await runMigrations(driver, migrations);

    expect(applied).toEqual(migrations.map((m) => m.version));
    expect(await getSchemaVersion(driver)).toBe(migrations[migrations.length - 1].version);
  });

  it('creates every table and index declared in the schema', async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);

    const tables = (await driver.all("SELECT name FROM sqlite_master WHERE type = 'table'")).map((r) => r.name);
    for (const expected of [
      'lancamentos',
      'categorias',
      'regras_categorizacao',
      'recorrencias',
      'metas',
      'valor_livre',
      'planejamento',
      'fechamentos',
      'gestor_lancamentos',
      'configuracoes',
      'sync_queue',
      'sync_state',
      'conflict_log',
    ]) {
      expect(tables).toContain(expected);
    }

    const indexes = (await driver.all("SELECT name FROM sqlite_master WHERE type = 'index'")).map((r) => r.name);
    expect(indexes).toContain('idx_lancamentos_data_vencimento');
    expect(indexes).toContain('idx_sync_queue_status_proxima_tentativa');
  });

  it('is idempotent — running twice does not re-apply or fail', async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
    const secondRun = await runMigrations(driver, migrations);

    expect(secondRun).toEqual([]);
    expect(await getSchemaVersion(driver)).toBe(migrations[migrations.length - 1].version);
  });

  it('rolls back the whole migration if one statement fails, leaving no partial schema', async () => {
    driver = createNodeSqliteDriver();
    const brokenMigration = {
      version: 1,
      async up(tx) {
        await tx.run('CREATE TABLE partial_table (id TEXT PRIMARY KEY)');
        await tx.run('THIS IS NOT VALID SQL');
      },
    };

    await expect(runMigrations(driver, [brokenMigration])).rejects.toThrow();
    expect(await getSchemaVersion(driver)).toBe(0);
    const tables = (await driver.all("SELECT name FROM sqlite_master WHERE type = 'table'")).map((r) => r.name);
    expect(tables).not.toContain('partial_table');
  });
});
