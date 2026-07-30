import { canSync } from './syncPolicy.js';
import { downloadRemoteChanges } from './downloadRemoteChanges.js';
import { processSyncQueue } from './processSyncQueue.js';

const LAST_SYNC_KEY_PREFIX = 'lastSyncAt:';

/** "Mostrar data da última sincronização" (Fase 11) — `null` se esta coleção nunca sincronizou com sucesso neste aparelho. */
export async function getLastSyncAt(driver, entidade) {
  const row = await driver.get('SELECT valor FROM sync_state WHERE chave = ?', [`${LAST_SYNC_KEY_PREFIX}${entidade}`]);
  return row?.valor ?? null;
}

async function recordSyncCompleted(driver, entidade) {
  await driver.run('INSERT OR REPLACE INTO sync_state (chave, valor) VALUES (?, ?)', [
    `${LAST_SYNC_KEY_PREFIX}${entidade}`,
    new Date().toISOString(),
  ]);
}

/**
 * Orquestrador de um ciclo de sincronização (Fase 11): baixa alterações
 * remotas (Fase 7) e envia a fila local (Fase 6) para cada entidade, só
 * quando `canSync` permite. Pensado para ser chamado periodicamente (ou ao
 * reconectar) por quem tiver esse gatilho — nenhum timer/listener de rede
 * é criado aqui.
 */
export async function runSyncCycle({ driver, uid, uploader, entidades, isPremium, isOnline, fetchChangedSince }) {
  if (!canSync({ isPremium, isOnline })) {
    return { skipped: true, reason: !isOnline ? 'offline' : 'sem_premium' };
  }

  const downloads = {};
  for (const entidade of entidades) {
    downloads[entidade] = await downloadRemoteChanges({ driver, uid, entidade, fetchChangedSince });
    await recordSyncCompleted(driver, entidade);
  }

  const upload = await processSyncQueue({ driver, uploader });

  return { skipped: false, downloads, upload };
}
