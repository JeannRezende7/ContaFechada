#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'node:fs';

function loadCredential() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath) {
    throw new Error('Defina GOOGLE_APPLICATION_CREDENTIALS com o caminho da service account do Firebase.');
  }
  return cert(JSON.parse(readFileSync(credentialPath, 'utf8')));
}

async function main() {
  const [identifier, operation] = process.argv.slice(2);
  if (!identifier || (operation && operation !== '--remove')) {
    throw new Error('Uso: npm run admin:set -- <uid-ou-email> [--remove]');
  }

  initializeApp({ credential: loadCredential() });
  const auth = getAuth();
  const user = identifier.includes('@')
    ? await auth.getUserByEmail(identifier)
    : await auth.getUser(identifier);
  const claims = { ...(user.customClaims || {}) };

  if (operation === '--remove') delete claims.admin;
  else claims.admin = true;

  await auth.setCustomUserClaims(user.uid, claims);
  await auth.revokeRefreshTokens(user.uid);
  console.log(
    operation === '--remove'
      ? `Acesso administrativo removido de ${user.uid}.`
      : `Acesso administrativo concedido a ${user.uid}. Faça login novamente no app.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
