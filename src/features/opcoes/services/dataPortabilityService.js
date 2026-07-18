import { listUserDocs, getUserDoc, deleteAllUserDocs, deleteUserDoc } from '../../../firebase/firestore.js';

/**
 * Every top-level collection a user's data lives in, kept in one place so
 * export and deletion (Fase 11: "Criar exportacao dos dados pessoais" /
 * "Criar fluxo de exclusao de conta") can never drift apart from each other
 * — adding a new collection to the app means updating this one list, not
 * two separate ones.
 */
const COLLECTIONS = ['lancamentos', 'categorias', 'recorrencias', 'metas', 'gestorLancamentos'];

/**
 * Everything the user has stored, as one plain object — downloaded as JSON
 * by the "Exportar meus dados" button in Opções. Includes the subscription
 * doc (plan/status) but not its internal `subscription_log` audit trail,
 * which documents actions taken by admins/webhooks rather than data the
 * user themselves entered.
 */
export async function exportUserData(uid) {
  const [collections, config, subscription] = await Promise.all([
    Promise.all(COLLECTIONS.map((name) => listUserDocs(uid, name))),
    getUserDoc(uid, 'config', 'geral'),
    getUserDoc(uid, 'private', 'subscription'),
  ]);

  const data = { exportadoEm: new Date().toISOString(), uid, config: config ?? null, subscription: subscription ?? null };
  COLLECTIONS.forEach((name, i) => {
    data[name] = collections[i];
  });
  return data;
}

/**
 * Wipes every Firestore doc belonging to the user — called right before
 * `deleteAccount()` (firebase/auth.js) as part of account deletion. Must run
 * BEFORE the Auth account is deleted: firestore.rules authorizes every
 * delete here off `request.auth.uid`, which stops resolving once the Auth
 * account is gone.
 */
export async function deleteAllUserData(uid) {
  await Promise.all(COLLECTIONS.map((name) => deleteAllUserDocs(uid, name)));
  await deleteUserDoc(uid, 'config', 'geral');
  await deleteUserDoc(uid, 'private', 'subscription');
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
