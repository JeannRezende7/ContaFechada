import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  clearSessionCaches: vi.fn(),
  nativeSignOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: { signOut: mocks.nativeSignOut, signInWithGoogle: vi.fn() },
}));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: vi.fn() },
  deleteUser: vi.fn(),
  onAuthStateChanged: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  reauthenticateWithPopup: vi.fn(),
  signInWithCredential: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: mocks.signOut,
}));
vi.mock('./config.js', () => ({ auth: { currentUser: { uid: 'user-1' } }, googleProvider: {} }));
vi.mock('../utils/deviceCache.js', () => ({ clearSessionCaches: mocks.clearSessionCaches }));

import { signOutUser } from './auth.js';

describe('signOutUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('encerra somente a sessao e nao executa nenhuma exclusao remota', async () => {
    await signOutUser();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.nativeSignOut).toHaveBeenCalledOnce();
    expect(mocks.clearSessionCaches).toHaveBeenCalledWith('user-1');
  });
});
