import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/deviceId.js', () => ({ getDeviceId: () => 'device-1' }));

import { createNodeSqliteDriver } from '../drivers/nodeSqliteDriver.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from '../migrations/index.js';
import { createCategoriasRepository } from '../../repositories/sqlite/categoriasRepository.js';
import { createLancamentosRepository } from '../../repositories/sqlite/lancamentosRepository.js';
import {
  detectPossibleDuplicateLancamentos,
  mergeLocalAndRemote,
  previewFirstSync,
  uploadLocalToFirestore,
} from './firstSync.js';

const BASE = { tipo: 'despesa', descricao: 'Mercado', valor: 100, dataVencimento: '2026-07-15', status: 'pendente' };

function makeFirebaseRepositories({ categorias = [], lancamentos = [] } = {}) {
  return {
    categorias: { list: vi.fn().mockResolvedValue(categorias) },
    lancamentos: { listAll: vi.fn().mockResolvedValue(lancamentos) },
  };
}

function makeUploader() {
  return { upsert: vi.fn().mockResolvedValue(), remove: vi.fn().mockResolvedValue() };
}

describe('detectPossibleDuplicateLancamentos', () => {
  it('flags same tipo/valor/data/descrição under different ids', () => {
    const localOnly = [{ id: 'l1', tipo: 'despesa', valor: 50, dataVencimento: '2026-07-10', descricao: 'Feira  ' }];
    const remoteOnly = [{ id: 'r1', tipo: 'despesa', valor: 50, dataVencimento: '2026-07-10', descricao: 'feira' }];

    expect(detectPossibleDuplicateLancamentos(localOnly, remoteOnly)).toEqual([
      { localId: 'l1', remoteId: 'r1', descricao: 'Feira  ', valor: 50, dataVencimento: '2026-07-10' },
    ]);
  });

  it('does not flag items that differ in value or date', () => {
    const localOnly = [{ id: 'l1', tipo: 'despesa', valor: 50, dataVencimento: '2026-07-10', descricao: 'Feira' }];
    const remoteOnly = [{ id: 'r1', tipo: 'despesa', valor: 51, dataVencimento: '2026-07-10', descricao: 'Feira' }];

    expect(detectPossibleDuplicateLancamentos(localOnly, remoteOnly)).toEqual([]);
  });
});

describe('firstSync', () => {
  let driver;

  beforeEach(async () => {
    driver = createNodeSqliteDriver();
    await runMigrations(driver, migrations);
  });

  afterEach(() => {
    driver.close();
  });

  it('previewFirstSync counts local-only, remote-only, in-both and possible duplicates without writing anything', async () => {
    const lancamentosRepo = createLancamentosRepository(driver);
    await lancamentosRepo.create('u1', BASE); // local-only
    const sharedId = await lancamentosRepo.create('u1', { ...BASE, descricao: 'Compartilhado' });

    const firebaseRepositories = makeFirebaseRepositories({
      lancamentos: [
        { id: sharedId, ...BASE, descricao: 'Compartilhado' }, // present in both
        { id: 'remote-only', ...BASE, descricao: 'Salário', tipo: 'receita', valor: 3000 },
        { id: 'remote-dup', tipo: 'despesa', valor: 100, dataVencimento: '2026-07-15', descricao: 'mercado' }, // matches BASE local-only
      ],
    });

    const preview = await previewFirstSync({ driver, uid: 'u1', firebaseRepositories });

    expect(preview.lancamentos.local).toBe(2);
    expect(preview.lancamentos.remoto).toBe(3);
    expect(preview.lancamentos.somenteLocal).toBe(1);
    expect(preview.lancamentos.somenteRemoto).toBe(2);
    expect(preview.lancamentos.emAmbos).toBe(1);
    expect(preview.lancamentos.possiveisDuplicatas).toHaveLength(1);

    // No writes happened.
    expect(await lancamentosRepo.listAll('u1')).toHaveLength(2);
  });

  it('uploadLocalToFirestore pushes every local record via the uploader, keyed by its own id', async () => {
    const categoriasRepo = createCategoriasRepository(driver);
    const lancamentosRepo = createLancamentosRepository(driver);
    const catId = await categoriasRepo.create('u1', { nome: 'Mercado', tipo: 'despesa', corKey: 'azul', icone: 'x', ordem: 1 });
    const lanId = await lancamentosRepo.create('u1', BASE);
    const uploader = makeUploader();

    const summary = await uploadLocalToFirestore({ driver, uploader });

    expect(summary).toEqual({ categorias: { count: 1 }, lancamentos: { count: 1 } });
    expect(uploader.upsert).toHaveBeenCalledWith('categorias', catId, expect.objectContaining({ nome: 'Mercado' }));
    expect(uploader.upsert).toHaveBeenCalledWith('lancamentos', lanId, expect.objectContaining({ descricao: 'Mercado' }));
    // `id` itself must not be duplicated inside the payload — it's the doc key.
    const [, , categoriaPayload] = uploader.upsert.mock.calls.find(([entidade]) => entidade === 'categorias');
    expect(categoriaPayload.id).toBeUndefined();
  });

  it('uploadLocalToFirestore never uploads a soft-deleted local record', async () => {
    const lancamentosRepo = createLancamentosRepository(driver);
    const id = await lancamentosRepo.create('u1', BASE);
    await driver.run("UPDATE lancamentos SET deleted_at = ? WHERE id = ?", [new Date().toISOString(), id]);
    const uploader = makeUploader();

    const summary = await uploadLocalToFirestore({ driver, uploader });

    expect(summary.lancamentos.count).toBe(0);
    expect(uploader.upsert).not.toHaveBeenCalled();
  });

  it('mergeLocalAndRemote downloads remote-only records and uploads local-only records', async () => {
    const lancamentosRepo = createLancamentosRepository(driver);
    await lancamentosRepo.create('u1', { ...BASE, descricao: 'Só local' });
    const uploader = makeUploader();
    const fetchChangedSince = vi.fn().mockImplementation((entidade) =>
      Promise.resolve(
        entidade === 'lancamentos'
          ? [{ id: 'remote-1', ...BASE, descricao: 'Só remoto', updatedAt: '2026-07-01T00:00:00.000Z' }]
          : []
      )
    );

    const result = await mergeLocalAndRemote({ driver, uid: 'u1', uploader, fetchChangedSince });

    expect(result.downloads.lancamentos.applied).toBe(1);
    expect(await driver.get('SELECT * FROM lancamentos WHERE id = ?', ['remote-1'])).toMatchObject({ descricao: 'Só remoto' });

    // Both the pre-existing local-only record and the just-downloaded one get (re-)asserted upward.
    expect(uploader.upsert).toHaveBeenCalledWith('lancamentos', 'remote-1', expect.objectContaining({ descricao: 'Só remoto' }));
    expect(uploader.upsert).toHaveBeenCalledWith('lancamentos', expect.any(String), expect.objectContaining({ descricao: 'Só local' }));
  });
});
