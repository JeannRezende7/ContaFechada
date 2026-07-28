import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  listUserDocs: vi.fn(),
  getUserDoc: vi.fn(),
  deleteAllUserDocs: vi.fn(),
  deleteUserDoc: vi.fn(),
}));
const authMock = vi.hoisted(() => ({ currentUser: null }));

vi.mock('../../../firebase/firestore.js', () => firestore);
vi.mock('../../../firebase/config.js', () => ({ auth: authMock }));

import { deleteAllUserData, exportUserData } from './dataPortabilityService.js';

const COLLECTIONS = ['lancamentos', 'categorias', 'regrasCategorizacao', 'recorrencias', 'metas', 'gestorLancamentos', 'planejamento', 'fechamentos'];

describe('dataPortabilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.currentUser = null;
    vi.unstubAllGlobals();
  });

  it('exports every user-owned collection plus config and subscription', async () => {
    firestore.listUserDocs.mockImplementation((_uid, collection) => Promise.resolve([{ id: `${collection}-1` }]));
    firestore.getUserDoc
      .mockResolvedValueOnce({ tema: 'dark' })
      .mockResolvedValueOnce({ plan: 'free' });

    const data = await exportUserData('u1');

    expect(data.uid).toBe('u1');
    expect(data.config).toEqual({ tema: 'dark' });
    expect(data.subscription).toEqual({ plan: 'free' });
    for (const collection of COLLECTIONS) {
      expect(data[collection]).toEqual([{ id: `${collection}-1` }]);
    }
    expect(firestore.listUserDocs).toHaveBeenCalledTimes(COLLECTIONS.length);
  });

  it('deletes public collections before requesting authenticated private-data deletion', async () => {
    authMock.currentUser = { uid: 'u1', getIdToken: vi.fn().mockResolvedValue('token-123') };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await deleteAllUserData('u1');

    for (const collection of COLLECTIONS) {
      expect(firestore.deleteAllUserDocs).toHaveBeenCalledWith('u1', collection);
    }
    expect(firestore.deleteUserDoc).toHaveBeenCalledWith('u1', 'config', 'geral');
    expect(fetchMock).toHaveBeenCalledWith('/api/delete-private-user-data', {
      method: 'POST',
      headers: { authorization: 'Bearer token-123' },
    });
  });

  it('rejects private deletion when the authenticated user does not match', async () => {
    authMock.currentUser = { uid: 'outro' };
    await expect(deleteAllUserData('u1')).rejects.toThrow('Usuário não autenticado.');
  });

  it('surfaces backend deletion failures', async () => {
    authMock.currentUser = { uid: 'u1', getIdToken: vi.fn().mockResolvedValue('token') };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Falha controlada' }),
    }));

    await expect(deleteAllUserData('u1')).rejects.toThrow('Falha controlada');
  });
});
