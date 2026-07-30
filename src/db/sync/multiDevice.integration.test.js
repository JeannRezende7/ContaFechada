import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/deviceId.js', () => ({ getDeviceId: () => 'test-device' }));

import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from '../migrations/index.js';
import { DOMAIN_ROW_CONFIG } from '../domainRowMappers.js';
import { downloadRemoteChanges } from './downloadRemoteChanges.js';
import { processSyncQueue } from './processSyncQueue.js';
import { enqueue } from './syncQueue.js';
import { detectPossibleDuplicateLancamentos } from './firstSync.js';

function createFakeCloud() {
  const docs = new Map();
  let failNext = false;
  return {
    docs,
    failOnce() { failNext = true; },
    uploader: {
      async upsert(entity, id, payload) {
        if (failNext) { failNext = false; throw new Error('network interrupted'); }
        docs.set(`${entity}/${id}`, { id, ...payload });
      },
      async remove(entity, id) { docs.delete(`${entity}/${id}`); },
    },
    async fetch(entity, since) {
      return [...docs.entries()]
        .filter(([key, value]) => key.startsWith(`${entity}/`) && value.updatedAt > since)
        .map(([, value]) => structuredClone(value));
    },
  };
}

const BASE = {
  id: 'l1',
  tipo: 'despesa',
  descricao: 'Mercado',
  valor: 100,
  dataVencimento: '2026-07-10',
  status: 'pendente',
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
  deviceId: 'a',
  localVersion: 1,
};

async function putLocal(driver, item) {
  await driver.run(DOMAIN_ROW_CONFIG.lancamentos.insertSql, DOMAIN_ROW_CONFIG.lancamentos.toRow(item));
}

describe('two-device local-first integration', () => {
  let a;
  let b;
  let cloud;
  beforeEach(async () => {
    a = createNodeSqliteDriver();
    b = createNodeSqliteDriver();
    await runMigrations(a, migrations);
    await runMigrations(b, migrations);
    cloud = createFakeCloud();
  });
  afterEach(() => { a.close(); b.close(); });

  it('converges two devices through upload and incremental download', async () => {
    await putLocal(a, BASE);
    await enqueue(a, { entidade: 'lancamentos', registroId: BASE.id, operacao: 'create', payload: { ...BASE } });
    await processSyncQueue({ driver: a, uploader: cloud.uploader });
    await downloadRemoteChanges({ driver: b, uid: 'u1', entidade: 'lancamentos', fetchChangedSince: cloud.fetch });
    expect(await b.get('SELECT descricao FROM lancamentos WHERE id = ?', ['l1'])).toEqual({ descricao: 'Mercado' });

    const newer = '2026-07-02T10:00:00.000Z';
    await b.run("UPDATE lancamentos SET descricao = 'Mercado B', updated_at = ? WHERE id = 'l1'", [newer]);
    await enqueue(b, { entidade: 'lancamentos', registroId: 'l1', operacao: 'update', payload: { ...BASE, descricao: 'Mercado B', updatedAt: newer } });
    await processSyncQueue({ driver: b, uploader: cloud.uploader });
    await downloadRemoteChanges({ driver: a, uid: 'u1', entidade: 'lancamentos', fetchChangedSince: cloud.fetch });
    expect(await a.get('SELECT descricao FROM lancamentos WHERE id = ?', ['l1'])).toEqual({ descricao: 'Mercado B' });
  });

  it('survives an interrupted upload and retries without duplicates', async () => {
    await putLocal(a, BASE);
    await enqueue(a, { entidade: 'lancamentos', registroId: 'l1', operacao: 'create', payload: { ...BASE } });
    cloud.failOnce();
    expect(await processSyncQueue({ driver: a, uploader: cloud.uploader })).toMatchObject({ failed: 1 });
    await a.run("UPDATE sync_queue SET proxima_tentativa_em = NULL WHERE registro_id = 'l1'");
    expect(await processSyncQueue({ driver: a, uploader: cloud.uploader })).toMatchObject({ succeeded: 1 });
    expect([...cloud.docs.keys()]).toEqual(['lancamentos/l1']);
  });

  it('keeps a newer local edit when a device clock produces an older remote value', async () => {
    await putLocal(a, { ...BASE, descricao: 'Local novo', updatedAt: '2026-07-03T10:00:00.000Z' });
    cloud.docs.set('lancamentos/l1', { ...BASE, descricao: 'Remoto antigo', updatedAt: '2026-07-02T10:00:00.000Z' });
    const result = await downloadRemoteChanges({ driver: a, uid: 'u1', entidade: 'lancamentos', fetchChangedSince: cloud.fetch });
    expect(result.conflicts[0].motivo).toBe('local_mais_novo');
    expect((await a.get("SELECT descricao FROM lancamentos WHERE id = 'l1'")).descricao).toBe('Local novo');
  });

  it('propagates tombstones and detects equivalent records with different ids', async () => {
    await putLocal(b, BASE);
    cloud.docs.set('lancamentos/l1', {
      ...BASE,
      updatedAt: '2026-07-04T10:00:00.000Z',
      deletedAt: '2026-07-04T10:00:00.000Z',
    });
    await downloadRemoteChanges({ driver: b, uid: 'u1', entidade: 'lancamentos', fetchChangedSince: cloud.fetch });
    expect((await b.get("SELECT deleted_at FROM lancamentos WHERE id = 'l1'")).deleted_at).toBeTruthy();

    const duplicates = detectPossibleDuplicateLancamentos(
      [{ ...BASE, id: 'local' }],
      [{ ...BASE, id: 'remote', descricao: ' mercado ' }]
    );
    expect(duplicates).toHaveLength(1);
  });
});
