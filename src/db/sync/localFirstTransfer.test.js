import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver.js';
import { migrations } from '../migrations/index.js';
import { runMigrations } from '../migrationRunner.js';
import { createSqliteRepositories } from '../../repositories/sqlite/repositories.js';
import {
  downloadRemoteSnapshot,
  mergeLocalAndRemoteSnapshots,
  persistFirstSyncBackup,
  previewLocalFirstTransfer,
  recoverMissingRemoteRecords,
  readLocalSnapshot,
  uploadLocalSnapshot,
} from './localFirstTransfer.js';

function fakeRemote(initial = {}) {
  const data = structuredClone(initial);
  return {
    data,
    async list(domain) { return Object.values(data[domain] ?? {}); },
    async upsert(domain, id, payload) {
      data[domain] ??= {};
      data[domain][id] = { id, ...payload };
    },
    async remove(domain, id) { delete data[domain]?.[id]; },
  };
}

describe('transferência local-first completa', () => {
  let driver;
  let repositories;

  beforeEach(async () => {
    vi.stubGlobal('localStorage', { getItem: () => 'device-transfer', setItem: vi.fn() });
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
    repositories = createSqliteRepositories(driver);
  });

  afterEach(() => {
    driver.close();
    vi.unstubAllGlobals();
  });

  it('mostra preview, persiste backup e envia todos os domínios', async () => {
    await repositories.metas.create('local', { nome: 'Reserva', valorAlvo: 1000, corKey: 'verde' });
    await repositories.configuracoes.setMetaEconomiaMensal('local', 300);
    const remote = fakeRemote();

    const preview = await previewLocalFirstTransfer({
      driver, remote, domains: ['metas', 'configuracoes'],
    });
    expect(preview.metas.somenteLocal).toBe(1);
    expect((await persistFirstSyncBackup(driver)).persisted).toBe(true);

    await uploadLocalSnapshot({ driver, remote, domains: ['metas', 'configuracoes'] });
    expect(Object.values(remote.data.metas)).toHaveLength(1);
    expect(Object.values(remote.data.configuracoes)[0]).toEqual(
      expect.objectContaining({ id: 'geral', metaEconomiaMensal: 300 })
    );
  });

  it('baixa substituindo o estado local e não cria operações de reenvio', async () => {
    await repositories.metas.create('local', { nome: 'Antiga', valorAlvo: 1, corKey: 'verde' });
    const remote = fakeRemote({
      metas: {
        cloud: {
          id: 'cloud', nome: 'Nuvem', valorAlvo: 200, valorAtual: 0, corKey: 'azul',
          createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
        },
      },
    });

    await downloadRemoteSnapshot({ driver, remote, domains: ['metas'], replace: true });
    expect(await repositories.metas.list('local')).toEqual([
      expect.objectContaining({ id: 'cloud', nome: 'Nuvem', syncStatus: 'synced' }),
    ]);
    expect((await driver.get("SELECT COUNT(*) AS count FROM sync_queue WHERE entidade='metas'")).count).toBe(0);
  });

  it('recupera somente registros remotos ausentes sem sobrescrever os locais', async () => {
    const localId = await repositories.lancamentos.create('local', {
      tipo: 'despesa', descricao: 'Editado no aparelho', valor: 90,
      dataVencimento: '2026-08-10', status: 'pendente',
    });
    const remote = fakeRemote({
      lancamentos: {
        [localId]: {
          id: localId, tipo: 'despesa', descricao: 'Versão antiga', valor: 80,
          dataVencimento: '2026-08-10', status: 'pendente',
        },
        legado: {
          id: 'legado', tipo: 'receita', descricao: 'Lançamento antigo', valor: 500,
          dataVencimento: '2025-01-05', status: 'recebido',
        },
      },
    });

    const result = await recoverMissingRemoteRecords({ driver, remote, domains: ['lancamentos'] });
    const local = await repositories.lancamentos.listAll('local');

    expect(result.recovered).toBe(1);
    expect(local.find((item) => item.id === localId).descricao).toBe('Editado no aparelho');
    expect(local.find((item) => item.id === 'legado').descricao).toBe('Lançamento antigo');
  });

  it('mescla por updatedAt e converge após repetição', async () => {
    const id = await repositories.metas.create('local', { nome: 'Local', valorAlvo: 100, corKey: 'verde' });
    const remote = fakeRemote({
      metas: {
        [id]: {
          id, nome: 'Remota antiga', valorAlvo: 50, corKey: 'azul',
          updatedAt: '2000-01-01T00:00:00.000Z',
        },
        remoteOnly: {
          id: 'remoteOnly', nome: 'Só nuvem', valorAlvo: 20, corKey: 'azul',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });

    await mergeLocalAndRemoteSnapshots({ driver, remote, domains: ['metas'] });
    await mergeLocalAndRemoteSnapshots({ driver, remote, domains: ['metas'] });

    const local = await readLocalSnapshot(driver);
    expect(local.metas.map((item) => item.id).sort()).toEqual([id, 'remoteOnly'].sort());
    expect(remote.data.metas[id].nome).toBe('Local');
  });

  it('baixa a nuvem quando o login ocorre com banco local vazio', async () => {
    const remote = fakeRemote({
      lancamentos: {
        cloud: {
          id: 'cloud', tipo: 'receita', descricao: 'Preservado na nuvem', valor: 750,
          dataVencimento: '2026-08-01', status: 'recebido', updatedAt: '2026-08-01T00:00:00.000Z',
        },
      },
    });

    const result = await mergeLocalAndRemoteSnapshots({ driver, remote, domains: ['lancamentos'] });
    const local = await readLocalSnapshot(driver);

    expect(result.summary.lancamentos).toEqual({ uploaded: 0, downloaded: 1 });
    expect(local.lancamentos).toEqual([expect.objectContaining({ id: 'cloud', valor: 750 })]);
    expect(remote.data.lancamentos.cloud.descricao).toBe('Preservado na nuvem');
  });
});
