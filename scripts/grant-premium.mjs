#!/usr/bin/env node
/**
 * Concessão manual de Premium para testes/parceiros (ROADMAP_MONETIZACAO.txt,
 * Fase 2/11). Não existe backend de cobrança ainda — este script é a única
 * forma prevista de promover um usuário até a Fase 8/9 existirem, e roda
 * com o Admin SDK, que ignora as Firestore Rules (o cliente web/Android
 * nunca consegue escrever em users/{uid}/private/subscription — ver
 * firestore.rules).
 *
 * Uso:
 *   node scripts/grant-premium.mjs <uid-ou-email> --dias 30 [--fundador] [--provider manual]
 *   node scripts/grant-premium.mjs <uid-ou-email> --revogar
 *
 * Aceita tanto o uid quanto o e-mail do usuário (se contiver "@", resolve via
 * Firebase Auth automaticamente).
 *
 * Credenciais:
 *   Requer uma service account key do projeto Firebase (Configurações do
 *   projeto > Contas de serviço > Gerar nova chave privada no console do
 *   Firebase — passo que só o dono do projeto pode fazer, então não está
 *   incluído aqui). Aponte para o arquivo baixado via:
 *   GOOGLE_APPLICATION_CREDENTIALS=./scripts/service-account.json node scripts/grant-premium.mjs ...
 *   (scripts/service-account.json está no .gitignore — nunca commitar essa chave.)
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'node:fs';

function parseArgs(argv) {
  const [identifier, ...rest] = argv;
  const opts = { dias: null, fundador: false, provider: 'manual', revogar: false };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--dias') opts.dias = Number(rest[++i]);
    else if (arg === '--fundador') opts.fundador = true;
    else if (arg === '--provider') opts.provider = rest[++i];
    else if (arg === '--revogar') opts.revogar = true;
    else throw new Error(`Argumento desconhecido: ${arg}`);
  }
  return { identifier, ...opts };
}

function loadCredential() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) {
    throw new Error(
      'Defina GOOGLE_APPLICATION_CREDENTIALS apontando para a service account key do Firebase.\n' +
        'Veja o cabeçalho deste arquivo para instruções de como gerar a chave.'
    );
  }
  return cert(JSON.parse(readFileSync(path, 'utf8')));
}

/** Audit trail (Fase 11: "Manter log das alteracoes de assinatura") — mesma subcoleção que o webhook usa. */
async function logChange(db, uid, entry) {
  await db.collection(`users/${uid}/private/subscription/subscription_log`).add({ ...entry, at: FieldValue.serverTimestamp() });
}

async function main() {
  const { identifier, dias, fundador, provider, revogar } = parseArgs(process.argv.slice(2));
  if (!identifier) {
    console.error('Uso: node scripts/grant-premium.mjs <uid-ou-email> --dias 30 [--fundador] [--provider manual]');
    console.error('     node scripts/grant-premium.mjs <uid-ou-email> --revogar');
    process.exit(1);
  }
  if (!revogar && (!dias || dias <= 0)) {
    console.error('Informe --dias <n> (quantos dias de Premium conceder), ou use --revogar.');
    process.exit(1);
  }

  initializeApp({ credential: loadCredential() });
  const db = getFirestore();

  const uid = identifier.includes('@') ? (await getAuth().getUserByEmail(identifier)).uid : identifier;
  const ref = db.doc(`users/${uid}/private/subscription`);

  const existing = await ref.get();
  if (!existing.exists) {
    console.error(
      `users/${uid}/private/subscription ainda não existe — o usuário precisa abrir o app pelo menos uma ` +
        'vez (ensureSubscriptionDoc roda no primeiro login) antes de receber uma concessão manual.'
    );
    process.exit(1);
  }

  if (revogar) {
    await ref.set(
      {
        plan: 'free',
        subscriptionStatus: 'canceled',
        cancelAtPeriodEnd: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await logChange(db, uid, { actor: 'admin_script:grant-premium', action: 'revogar' });
    console.log(`Premium revogado para uid=${uid}.`);
    return;
  }

  const currentPeriodEnd = Timestamp.fromMillis(Date.now() + dias * 86_400_000);
  await ref.set(
    {
      plan: 'premium',
      subscriptionStatus: 'active',
      subscriptionProvider: provider,
      subscriptionId: `manual_${Date.now()}`,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      founder: fundador,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await logChange(db, uid, { actor: 'admin_script:grant-premium', action: 'conceder', dias, fundador, provider });
  console.log(`Premium concedido para uid=${uid} até ${currentPeriodEnd.toDate().toISOString()} (fundador=${fundador}).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
