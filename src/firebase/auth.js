import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  GoogleAuthProvider,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from './config.js';
import { clearSessionCaches } from '../utils/deviceCache.js';

async function getNativeGoogleCredential() {
  // Credential Manager is the Android default in recent plugin versions, but
  // some devices return from its account chooser to an empty/black activity.
  // The classic native Google flow is more broadly compatible for the APK.
  const result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
  const { idToken, accessToken } = result.credential ?? {};
  if (!idToken && !accessToken) throw new Error('O Google não retornou uma credencial válida.');
  return GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null);
}

/** Uses native Google Sign-In in the APK and a popup in regular browsers. */
export async function signInWithGoogle() {
  if (!Capacitor.isNativePlatform()) return signInWithPopup(auth, googleProvider);
  return signInWithCredential(auth, await getNativeGoogleCredential());
}

/** Signs the current user out. */
export async function signOutUser() {
  const uid = auth.currentUser?.uid;
  await signOut(auth);
  if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut().catch(() => {});
  clearSessionCaches(uid);
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
  if (Capacitor.isNativePlatform()) {
    await reauthenticateWithCredential(user, await getNativeGoogleCredential());
  } else {
    await reauthenticateWithPopup(user, googleProvider);
  }
  await deleteUser(user);
}

/** Subscribes to auth state changes. Returns the unsubscribe function. */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}
