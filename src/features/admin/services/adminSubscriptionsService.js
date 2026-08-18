import { auth } from '../../../firebase/config.js';

async function callAdmin(body, query = '') {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  const token = await user.getIdToken();
  const response = await fetch(`/api/admin-subscriptions${query}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 403) {
    const error = new Error('Esta conta não possui permissão administrativa.');
    error.code = 'forbidden';
    throw error;
  }
  if (!response.ok) throw new Error(data.error || 'Falha na operação administrativa.');
  return data;
}

export function listAdminSubscriptions({ search = '', offset = 0, limit = 50 } = {}) {
  const query = new URLSearchParams({ search, offset: String(offset), limit: String(limit) });
  return callAdmin(null, `?${query}`);
}

export function grantAdminPremium({ identifier }) {
  return callAdmin({ action: 'grant', identifier });
}

export function revokeAdminPremium(identifier) {
  return callAdmin({ action: 'revoke', identifier });
}

export function getAdminSubscriptionHistory(uid) {
  const query = new URLSearchParams({ action: 'history', uid, limit: '50' });
  return callAdmin(null, `?${query}`).then((result) => result.history);
}
