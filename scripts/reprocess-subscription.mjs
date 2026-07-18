#!/usr/bin/env node
/**
 * Resincroniza a assinatura Web de um usuário direto com o MercadoPago
 * (ROADMAP_MONETIZACAO.txt, Fase 11: "Reprocessar/sincronizar assinatura com
 * o provedor") — útil quando um webhook falhou ou atrasou. Reaproveita a
 * mesma lógica de tradução MercadoPago -> Firestore que o webhook usa
 * (netlify/lib/subscriptionWriter.js), então nunca diverge do comportamento
 * do webhook.
 *
 * Uso:
 *   node scripts/reprocess-subscription.mjs <uid-ou-email>
 *
 * Credenciais (diferente dos outros scripts — reaproveita netlify/lib, que
 * lê a service account de uma env var, não de um arquivo):
 *   FIREBASE_SERVICE_ACCOUNT='<conteúdo do JSON da service account>' \
 *   MERCADOPAGO_ACCESS_TOKEN='...' \
 *   node scripts/reprocess-subscription.mjs <uid-ou-email>
 *
 * NÃO TESTADO — depende de uma assinatura real no MercadoPago pra validar.
 */
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from '../netlify/lib/firebaseAdmin.js';
import { applyMercadoPagoPreapproval } from '../netlify/lib/subscriptionWriter.js';

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error('Uso: node scripts/reprocess-subscription.mjs <uid-ou-email>');
    process.exit(1);
  }
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.error('Defina MERCADOPAGO_ACCESS_TOKEN.');
    process.exit(1);
  }

  const db = getAdminDb();
  const uid = identifier.includes('@') ? (await getAuth().getUserByEmail(identifier)).uid : identifier;

  const subSnap = await db.doc(`users/${uid}/private/subscription`).get();
  const sub = subSnap.data();
  if (!sub?.subscriptionId || sub.subscriptionProvider !== 'web') {
    console.error(`uid=${uid} não tem assinatura Web (MercadoPago) registrada para reprocessar.`);
    process.exit(1);
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  const preapproval = await new PreApproval(client).get({ id: sub.subscriptionId });

  const patch = await applyMercadoPagoPreapproval(uid, preapproval, { actor: 'admin_script:reprocess-subscription' });
  console.log(`uid=${uid} resincronizado:`, patch);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
