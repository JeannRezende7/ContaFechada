import { listUserDocs, getUserDoc, deleteAllUserDocs, deleteUserDoc } from '../../../firebase/firestore.js';
import { auth } from '../../../firebase/config.js';
import { USER_FINANCIAL_COLLECTIONS } from '../../../../shared/userDataCollections.js';

/**
 * Every top-level collection a user's data lives in, kept in one place so
 * export and deletion (Fase 11: "Criar exportacao dos dados pessoais" /
 * "Criar fluxo de exclusao de conta") can never drift apart from each other
 * — adding a new collection to the app means updating this one list, not
 * two separate ones.
 */
const COLLECTIONS = USER_FINANCIAL_COLLECTIONS;

/**
 * Everything the user has stored, as one plain object — downloaded as JSON
 * by the "Exportar meus dados" button in Opções. Includes the subscription
 * doc (plan/status) but not its internal `subscription_log` audit trail,
 * which documents actions taken by admins/webhooks rather than data the
 * user themselves entered.
 */
export async function exportUserData(uid) {
  const [collections, config, subscription] = await Promise.all([
    // Export must be an authoritative snapshot, not a possibly older
    // in-memory result used to make ordinary navigation cheaper.
    Promise.all(COLLECTIONS.map((name) => listUserDocs(uid, name, { source: 'server' }))),
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

  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error('Usuário não autenticado.');
  const token = await user.getIdToken();
  const response = await fetch('/api/delete-private-user-data', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível excluir os dados privados da conta.');
  }
}

/**
 * Fase 11 do roadmap local-first: "Permitir exclusão antecipada da cópia
 * remota" — apaga só os dados financeiros do Firestore (mesma lista de
 * `COLLECTIONS` acima), mas MANTÉM a conta e o documento de assinatura
 * intactos. Diferente de `deleteAllUserData`, que só é chamada como parte
 * da exclusão completa da conta (e por isso também remove a conta do
 * Firebase Auth). Não toca no SQLite local — os dados no aparelho
 * continuam lá; só a cópia na nuvem é removida antes do prazo normal de
 * retenção (90 dias, ver FASE0_DECISOES.md).
 */
export async function deleteCloudCopyOnly(uid) {
  await Promise.all(COLLECTIONS.map((name) => deleteAllUserDocs(uid, name)));
  await deleteUserDoc(uid, 'config', 'geral');
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
