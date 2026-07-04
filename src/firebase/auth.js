import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from './config.js';

/** Opens the Google OAuth popup and signs the user in. */
export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

/** Signs the current user out. */
export function signOutUser() {
  return signOut(auth);
}

/** Subscribes to auth state changes. Returns the unsubscribe function. */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}
