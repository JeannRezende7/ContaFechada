import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const batches = [];
  function makeBatch() {
    const batch = { set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn().mockResolvedValue() };
    batches.push(batch);
    return batch;
  }
  return {
    batches,
    makeBatch,
    db: { name: 'firestore-test' },
    setDoc: vi.fn().mockResolvedValue(),
    updateDoc: vi.fn().mockResolvedValue(),
    deleteDoc: vi.fn().mockResolvedValue(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    getDocsFromCache: vi.fn(),
    getDocsFromServer: vi.fn(),
  };
});

vi.mock('../utils/deviceId.js', () => ({ getDeviceId: () => 'device-1' }));
vi.mock('./config.js', () => ({ db: mocks.db }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args) => ({ path: args.slice(1).join('/') })),
  doc: vi.fn((...args) => ({ path: args.slice(1).join('/') })),
  setDoc: mocks.setDoc,
  updateDoc: mocks.updateDoc,
  deleteDoc: mocks.deleteDoc,
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  getDocsFromCache: mocks.getDocsFromCache,
  getDocsFromServer: mocks.getDocsFromServer,
  query: vi.fn((col) => col),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  increment: vi.fn((n) => ({ __increment: n })),
  writeBatch: vi.fn(() => mocks.makeBatch()),
  Timestamp: { fromDate: vi.fn((date) => ({ __timestamp: date.toISOString() })) },
}));

import {
  batchSetUserDocs,
  batchUpdateUserDocs,
  batchUpdateUserDocsWithData,
  createUserDoc,
  listUserDocsUpdatedSince,
  setUserDoc,
  setUserDocMerged,
  tombstoneUserDoc,
  updateUserDoc,
} from './firestore.js';

describe('firestore.js — Fase 2 sync metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.batches.length = 0;
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-1');
  });

  it('createUserDoc writes a client-generated UUID id with full sync metadata and returns that id', async () => {
    const id = await createUserDoc('u1', 'lancamentos', { descricao: 'Salário' });

    expect(id).toBe('uuid-1');
    expect(mocks.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      {
        descricao: 'Salário',
        createdAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
        deletedAt: null,
        deviceId: 'device-1',
        syncStatus: 'synced',
        localVersion: 1,
      }
    );
  });

  it('setUserDoc stamps the same metadata on a caller-chosen deterministic id', async () => {
    await setUserDoc('u1', 'fechamentos', '2026-07', { saldoReal: 100 });

    expect(mocks.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        saldoReal: 100,
        deletedAt: null,
        deviceId: 'device-1',
        syncStatus: 'synced',
        localVersion: 1,
      })
    );
  });

  it('setUserDocMerged tags the shared config doc with deviceId and bumps localVersion via increment', async () => {
    await setUserDocMerged('u1', 'config', 'geral', { metaEconomiaMensal: 500 });

    expect(mocks.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      {
        metaEconomiaMensal: 500,
        deviceId: 'device-1',
        updatedAt: 'SERVER_TIMESTAMP',
        syncStatus: 'synced',
        localVersion: { __increment: 1 },
      },
      { merge: true }
    );
  });

  it('writes a mergeable tombstone for incremental deletion sync', async () => {
    await tombstoneUserDoc('u1', 'lancamentos', 'l1');

    expect(mocks.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        deletedAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
        syncStatus: 'synced',
        localVersion: { __increment: 1 },
      }),
      { merge: true }
    );
  });

  it('batchSetUserDocs stamps metadata on every item, keeping the caller-chosen ids', async () => {
    await batchSetUserDocs('u1', 'lancamentos', {
      'imp-1': { descricao: 'a' },
      'imp-2': { descricao: 'b' },
    });

    expect(mocks.batches[0].set).toHaveBeenCalledTimes(2);
    expect(mocks.batches[0].set.mock.calls[0][1]).toMatchObject({
      descricao: 'a',
      deviceId: 'device-1',
      syncStatus: 'synced',
      localVersion: 1,
      deletedAt: null,
    });
  });

  it('updateUserDoc merges caller data with updatedAt/syncStatus and increments localVersion', async () => {
    await updateUserDoc('u1', 'lancamentos', 'l1', { status: 'pago' });

    expect(mocks.updateDoc).toHaveBeenCalledWith(expect.anything(), {
      status: 'pago',
      updatedAt: 'SERVER_TIMESTAMP',
      syncStatus: 'synced',
      localVersion: { __increment: 1 },
    });
  });

  it('batchUpdateUserDocs applies the metadata bump to every id in the batch', async () => {
    await batchUpdateUserDocs('u1', 'lancamentos', ['l1', 'l2'], { categoriaId: 'c1' });

    expect(mocks.batches[0].update).toHaveBeenCalledTimes(2);
    expect(mocks.batches[0].update.mock.calls[0][1]).toEqual({
      categoriaId: 'c1',
      updatedAt: 'SERVER_TIMESTAMP',
      syncStatus: 'synced',
      localVersion: { __increment: 1 },
    });
  });

  it('batchUpdateUserDocsWithData applies the metadata bump per document alongside its own data', async () => {
    await batchUpdateUserDocsWithData('u1', 'lancamentos', {
      l1: { categoriaId: 'c1' },
      l2: { categoriaId: 'c2' },
    });

    expect(mocks.batches[0].update.mock.calls[0][1]).toEqual({
      categoriaId: 'c1',
      updatedAt: 'SERVER_TIMESTAMP',
      syncStatus: 'synced',
      localVersion: { __increment: 1 },
    });
    expect(mocks.batches[0].update.mock.calls[1][1]).toEqual({
      categoriaId: 'c2',
      updatedAt: 'SERVER_TIMESTAMP',
      syncStatus: 'synced',
      localVersion: { __increment: 1 },
    });
  });

  it('listUserDocsUpdatedSince queries by a Timestamp built from the given ISO date', async () => {
    mocks.getDocs.mockResolvedValue({ docs: [{ id: 'l1', data: () => ({ descricao: 'Feira' }) }] });

    const result = await listUserDocsUpdatedSince('u1', 'lancamentos', '2026-07-01T00:00:00.000Z');

    expect(result).toEqual([{ id: 'l1', descricao: 'Feira' }]);
  });
});
