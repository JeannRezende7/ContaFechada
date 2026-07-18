import { signInWithPopup, signOut, onAuthStateChanged, reauthenticateWithPopup, deleteUser } from 'firebase/auth';
import { auth, googleProvider } from './config.js';

/** Opens the Google OAuth popup and signs the user in. */
export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

/** Signs the current user out. */
export function signOutUser() {
  return signOut(auth);
}

/**
 * Permanently deletes the current user's Firebase Auth account (Fase 11:
 * "Criar fluxo de exclusao de conta"). Firestore data must be wiped by the
 * caller *before* this — deleting the Auth account first would leave orphaned
 * data with no way to prove ownership anymore, since firestore.rules checks
 * `request.auth.uid`, which stops existing the moment this resolves.
 *
 * Deleting an account is a Firebase-designated "sensitive" operation that
 * requires a *recent* login — re-prompts the Google popup right before the
 * delete instead of failing with `auth/requires-recent-login` on a session
 * that's been open for a while.
 */
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário autenticado.');
  await reauthenticateWithPopup(user, googleProvider);
  await deleteUser(user);
}

/** Subscribes to auth state changes. Returns the unsubscribe function. */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}
