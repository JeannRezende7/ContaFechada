#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'node:fs';

function loadCredential() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) throw new Error('Defina GOOGLE_APPLICATION_CREDENTIALS para a chave de servico do Firebase.');
  return cert(JSON.parse(readFileSync(path, 'utf8')));
}

async function main() {
  const [identifier, action = '--grant'] = process.argv.slice(2);
  if (!identifier || !['--grant', '--revoke'].includes(action)) {
    throw new Error('Uso: node scripts/grant-premium-lifetime.mjs <uid-ou-email> [--grant|--revoke]');
  }
  initializeApp({ credential: loadCredential() });
  const auth = getAuth();
  const uid = identifier.includes('@') ? (await auth.getUserByEmail(identifier)).uid : identifier;
  await auth.getUser(uid);
  const db = getFirestore();
  const granted = action === '--grant';
  await db.doc(`users/${uid}/private/subscription`).set({
    plan: granted ? 'pro' : 'free',
    proLifetime: granted,
    subscriptionProvider: granted ? 'manual' : null,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await db.collection(`users/${uid}/private/subscription/subscription_log`).add({
    action: granted ? 'grant_lifetime' : 'revoke_lifetime',
    actor: 'admin_script',
    at: FieldValue.serverTimestamp(),
  });
  console.log(`Acesso Pro ${granted ? 'concedido' : 'revogado'} para uid=${uid}.`);
}

main().catch((error) => {
  console.error(error?.message ?? 'Falha administrativa.');
  process.exit(1);
});
