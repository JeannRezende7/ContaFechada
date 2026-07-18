import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * Shared Admin SDK bootstrap for every Netlify Function (ROADMAP_MONETIZACAO.txt,
 * Fase 8). Reads the service account from FIREBASE_SERVICE_ACCOUNT — set this
 * in the Netlify dashboard (Site configuration > Environment variables) as
 * the *raw JSON contents* of a service account key (Firebase Console >
 * Configurações do projeto > Contas de serviço > Gerar nova chave privada),
 * pasted as a single value. Never commit this key.
 */
function getAdminApp() {
  const existing = getApps();
  if (existing.length) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT não configurada — defina essa env var no Netlify com o JSON da service account.'
    );
  }
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

/** Verifies the Firebase ID token from an `Authorization: Bearer <token>` header. Throws if missing/invalid. */
export async function verifyIdToken(authorizationHeader) {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('missing bearer token');
  return getAuth(getAdminApp()).verifyIdToken(token);
}
