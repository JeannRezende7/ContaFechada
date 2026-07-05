import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

// All values come from .env (see .env.example). Never commit real keys.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * IndexedDB-backed local cache: reads fall back to the last-synced data and
 * writes queue locally while offline, flushing to Firestore automatically
 * once the connection returns — no custom sync code needed. Falls back to
 * plain in-memory Firestore if the browser can't support it (e.g. some
 * private-browsing modes), so the app still works, just without offline data.
 *
 * `experimentalAutoDetectLongPolling` avoids a known thrash: without it, some
 * networks/browsers (proxies, mobile carriers, iOS Safari) let Firestore's
 * streaming connection open but silently break it, so the SDK keeps
 * reconnecting every ~150ms in a loop instead of holding one real connection.
 * This makes it explicitly probe first and commit to whichever transport
 * actually works.
 */
export let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  db = getFirestore(app);
}

export const googleProvider = new GoogleAuthProvider();
