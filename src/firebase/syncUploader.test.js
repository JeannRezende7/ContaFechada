import { describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  setUserDoc: vi.fn(),
  deleteUserDoc: vi.fn(),
}));

vi.mock('./firestore.js', () => firestore);

import { createFirestoreSyncUploader } from './syncUploader.js';

describe('createFirestoreSyncUploader', () => {
  it('upsert writes to the record\'s own id via setUserDoc', () => {
    const uploader = createFirestoreSyncUploader('u1');
    uploader.upsert('lancamentos', 'l1', { valor: 10 });

    expect(firestore.setUserDoc).toHaveBeenCalledWith('u1', 'lancamentos', 'l1', { valor: 10 });
  });

  it('remove deletes the record via deleteUserDoc', () => {
    const uploader = createFirestoreSyncUploader('u1');
    uploader.remove('lancamentos', 'l1');

    expect(firestore.deleteUserDoc).toHaveBeenCalledWith('u1', 'lancamentos', 'l1');
  });
});
