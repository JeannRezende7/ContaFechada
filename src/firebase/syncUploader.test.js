import { describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  setUserDoc: vi.fn(),
  tombstoneUserDoc: vi.fn(),
}));

vi.mock('./firestore.js', () => firestore);

import { createFirestoreSyncUploader } from './syncUploader.js';

describe('createFirestoreSyncUploader', () => {
  it('upsert writes to the record\'s own id via setUserDoc', () => {
    const uploader = createFirestoreSyncUploader('u1');
    uploader.upsert('lancamentos', 'l1', { valor: 10 });

    expect(firestore.setUserDoc).toHaveBeenCalledWith('u1', 'lancamentos', 'l1', { valor: 10 });
  });

  it('remove writes a tombstone so other devices receive the deletion', () => {
    const uploader = createFirestoreSyncUploader('u1');
    uploader.remove('lancamentos', 'l1');

    expect(firestore.tombstoneUserDoc).toHaveBeenCalledWith('u1', 'lancamentos', 'l1');
  });

  it('maps local configuration documents to the legacy remote collection', () => {
    const uploader = createFirestoreSyncUploader('u1');
    uploader.upsert('configuracoes', 'geral', { moeda: 'BRL' });

    expect(firestore.setUserDoc).toHaveBeenCalledWith('u1', 'config', 'geral', { moeda: 'BRL' });
  });
});
