import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/deviceId.js', () => ({ getDeviceId: () => 'device-1' }));

import { createNodeSqliteDriver } from '../../db/drivers/nodeSqliteDriver.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { migrations } from '../../db/migrations/index.js';
import { createCategoriasRepository } from './categoriasRepository.js';

describe('sqlite categoriasRepository', () => {
  let driver;
  let repo;

  beforeEach(async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
    repo = createCategoriasRepository(driver);
  });

  afterEach(() => {
    driver.close();
  });

  it('creates a categoria with sync metadata and lists it back ordered by ordem', async () => {
    await repo.create('u1', { nome: 'Mercado', tipo: 'despesa', corKey: 'azul', icone: 'shoppingBasket', ordem: 2 });
    await repo.create('u1', { nome: 'Salário', tipo: 'receita', corKey: 'verde', icone: 'wallet', ordem: 1 });

    const categorias = await repo.list('u1');

    expect(categorias.map((c) => c.nome)).toEqual(['Salário', 'Mercado']);
    expect(categorias[0]).toMatchObject({
      tipo: 'receita',
      corKey: 'verde',
      padrao: false,
      deviceId: 'device-1',
      syncStatus: 'local',
      localVersion: 1,
      deletedAt: null,
    });
  });

  it('ensureDefaults seeds the default taxonomy only once', async () => {
    const seeded = await repo.ensureDefaults('u1');
    expect(seeded.length).toBeGreaterThan(0);
    expect(seeded.every((c) => c.padrao)).toBe(true);

    await repo.create('u1', { nome: 'Custom', tipo: 'despesa', corKey: 'azul', icone: 'tag', ordem: 999 });
    const secondCall = await repo.ensureDefaults('u1');

    expect(secondCall.length).toBe(seeded.length + 1);
  });

  it('remove deletes a single categoria; removeAll wipes every one', async () => {
    const id = await repo.create('u1', { nome: 'Lazer', tipo: 'despesa', corKey: 'roxo', icone: 'gamepad2', ordem: 1 });
    await repo.create('u1', { nome: 'Salário', tipo: 'receita', corKey: 'verde', icone: 'wallet', ordem: 1 });

    await repo.remove('u1', id);
    expect((await repo.list('u1')).map((c) => c.nome)).toEqual(['Salário']);

    await repo.removeAll('u1');
    expect(await repo.list('u1')).toEqual([]);
  });
});
