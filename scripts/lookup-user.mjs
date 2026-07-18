#!/usr/bin/env node
/**
 * Consulta um usuário por uid ou e-mail (ROADMAP_MONETIZACAO.txt, Fase 11:
 * "Consultar usuario por email/uid" / "Ver plano, status, provedor e
 * expiracao"). Somente leitura — nunca altera nada.
 *
 * Uso:
 *   node scripts/lookup-user.mjs <uid-ou-email>
 *
 * Credenciais: mesma coisa que scripts/grant-premium.mjs —
 *   GOOGLE_APPLICATION_CREDENTIALS=./scripts/service-account.json node scripts/lookup-user.mjs ...
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'node:fs';

function loadCredential() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) {
    throw new Error('Defina GOOGLE_APPLICATION_CREDENTIALS apontando para a service account key do Firebase.');
  }
  return cert(JSON.parse(readFileSync(path, 'utf8')));
}

function formatTimestamp(ts) {
  return ts ? ts.toDate().toISOString() : '—';
}

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error('Uso: node scripts/lookup-user.mjs <uid-ou-email>');
    process.exit(1);
  }

  initializeApp({ credential: loadCredential() });
  const db = getFirestore();
  const auth = getAuth();

  const authUser = identifier.includes('@') ? await auth.getUserByEmail(identifier) : await auth.getUser(identifier);

  console.log(`\nUsuário: ${authUser.displayName ?? '(sem nome)'} <${authUser.email ?? 'sem e-mail'}>`);
  console.log(`uid: ${authUser.uid}`);
  console.log(`Criado em: ${authUser.metadata.creationTime}`);
  console.log(`Último login: ${authUser.metadata.lastSignInTime}`);

  const subSnap = await db.doc(`users/${authUser.uid}/private/subscription`).get();
  if (!subSnap.exists) {
    console.log('\nSem documento de assinatura — nunca abriu o app (ou abriu antes da Fase 2 existir).');
    return;
  }

  const sub = subSnap.data();
  console.log('\nAssinatura:');
  console.log(`  plan: ${sub.plan}`);
  console.log(`  subscriptionStatus: ${sub.subscriptionStatus}`);
  console.log(`  subscriptionProvider: ${sub.subscriptionProvider}`);
  console.log(`  subscriptionId: ${sub.subscriptionId ?? '—'}`);
  console.log(`  currentPeriodEnd: ${formatTimestamp(sub.currentPeriodEnd)}`);
  console.log(`  cancelAtPeriodEnd: ${sub.cancelAtPeriodEnd}`);
  console.log(`  trialStartedAt: ${formatTimestamp(sub.trialStartedAt)}`);
  console.log(`  trialEndsAt: ${formatTimestamp(sub.trialEndsAt)}`);
  console.log(`  founder: ${sub.founder}`);

  const logSnap = await db
    .collection(`users/${authUser.uid}/private/subscription/subscription_log`)
    .orderBy('at', 'desc')
    .limit(10)
    .get();

  if (!logSnap.empty) {
    console.log('\nÚltimas alterações:');
    for (const doc of logSnap.docs) {
      const entry = doc.data();
      console.log(`  [${formatTimestamp(entry.at)}] ${entry.actor ?? '?'} — ${entry.action ?? entry.source ?? '?'}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
