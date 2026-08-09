import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/deviceId.js', () => ({ getDeviceId: () => 'device-1' }));

import { createNodeSqliteDriver } from '../../db/drivers/nodeSqliteDriver.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { migrations } from '../../db/migrations/index.js';
import { createLancamentosRepository } from './lancamentosRepository.js';

const BASE = { tipo: 'despesa', descricao: 'Mercado', valor: 100, dataVencimento: '2026-07-15', status: 'pendente' };

describe('sqlite lancamentosRepository', () => {
  let driver;
  let repo;

  beforeEach(async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
    repo = createLancamentosRepository(driver);
  });

  afterEach(() => {
    driver.close();
  });

  it('creates a lançamento with sync metadata and reads it back via listAll', async () => {
    const id = await repo.create('u1', BASE);
    const items = await repo.listAll('u1');

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id,
      ...BASE,
      dataPagamento: null,
      categoriaId: null,
      deviceId: 'device-1',
      syncStatus: 'local',
      localVersion: 1,
      deletedAt: null,
    });
  });

  it('hasAny reflects whether any (non-deleted) lançamento exists', async () => {
    expect(await repo.hasAny('u1')).toBe(false);
    await repo.create('u1', BASE);
    expect(await repo.hasAny('u1')).toBe(true);
  });

  it('listByMonth and listByRange filter by dataVencimento', async () => {
    await repo.create('u1', { ...BASE, dataVencimento: '2026-06-30' });
    await repo.create('u1', { ...BASE, dataVencimento: '2026-07-01' });
    await repo.create('u1', { ...BASE, dataVencimento: '2026-07-31' });
    await repo.create('u1', { ...BASE, dataVencimento: '2026-08-01' });

    const julho = await repo.listByMonth('u1', '2026-07');
    expect(julho.map((i) => i.dataVencimento)).toEqual(['2026-07-31', '2026-07-01']);

    const range = await repo.listByRange('u1', '2026-06-30', '2026-07-01');
    expect(range.map((i) => i.dataVencimento)).toEqual(['2026-07-01', '2026-06-30']);
  });

  it('update bumps localVersion and moves synced -> pending, but leaves local as local', async () => {
    const id = await repo.create('u1', BASE);
    await driver.run("UPDATE lancamentos SET sync_status = 'synced' WHERE id = ?", [id]);

    await repo.update('u1', id, { status: 'pago', valor: 150 });
    const [updated] = await repo.listAll('u1');

    expect(updated.status).toBe('pago');
    expect(updated.valor).toBe(150);
    expect(updated.syncStatus).toBe('pending');
    expect(updated.localVersion).toBe(2);

    const id2 = await repo.create('u1', BASE);
    await repo.update('u1', id2, { status: 'pago' });
    const stillLocal = (await repo.listAll('u1')).find((i) => i.id === id2);
    expect(stillLocal.syncStatus).toBe('local');
  });

  it('setStatus is a shorthand for updating only the status field', async () => {
    const id = await repo.create('u1', BASE);
    await repo.setStatus('u1', id, 'pago');
    const [item] = await repo.listAll('u1');
    expect(item.status).toBe('pago');
  });

  it('remove deletes a single lançamento; removeAll wipes every one', async () => {
    const id = await repo.create('u1', BASE);
    await repo.create('u1', { ...BASE, descricao: 'Outro' });

    await repo.remove('u1', id);
    expect((await repo.listAll('u1')).map((i) => i.descricao)).toEqual(['Outro']);

    await repo.removeAll('u1');
    expect(await repo.listAll('u1')).toEqual([]);
  });
});
