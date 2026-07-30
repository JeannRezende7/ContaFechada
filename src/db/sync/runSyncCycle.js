import { canSync } from './syncPolicy.js';
import { downloadRemoteChanges } from './downloadRemoteChanges.js';
import { processSyncQueue } from './processSyncQueue.js';
import { countPending } from './syncQueue.js';

const LAST_SYNC_KEY_PREFIX = 'lastSyncAt:';
const SYNC_METRICS_KEY = 'syncMetrics';

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

export async function getSyncMetrics(driver) {
  const row = await driver.get('SELECT valor FROM sync_state WHERE chave = ?', [SYNC_METRICS_KEY]);
  if (!row?.valor) return { cycles: 0, durationMsTotal: 0, lastDurationMs: null, bytesUploaded: 0, bytesDownloaded: 0, errors: 0, recentSamples: [] };
  try {
    const parsed = JSON.parse(row.valor);
    return { bytesDownloaded: 0, recentSamples: [], ...parsed };
  } catch {
    return { cycles: 0, durationMsTotal: 0, lastDurationMs: null, bytesUploaded: 0, bytesDownloaded: 0, errors: 0, recentSamples: [] };
  }
}

async function recordSyncMetrics(driver, { durationMs, bytesUploaded, bytesDownloaded, errors, queuePending }) {
  const current = await getSyncMetrics(driver);
  const recordedAt = new Date().toISOString();
  const recentSamples = [
    ...(current.recentSamples ?? []),
    { recordedAt, durationMs, bytesUploaded, bytesDownloaded, errors, queuePending },
  ].slice(-20);
  const next = {
    cycles: current.cycles + 1,
    durationMsTotal: current.durationMsTotal + durationMs,
    lastDurationMs: durationMs,
    bytesUploaded: current.bytesUploaded + bytesUploaded,
    bytesDownloaded: current.bytesDownloaded + bytesDownloaded,
    errors: current.errors + errors,
    lastRecordedAt: recordedAt,
    recentSamples,
  };
  await driver.run('INSERT OR REPLACE INTO sync_state (chave, valor) VALUES (?, ?)', [
    SYNC_METRICS_KEY,
    JSON.stringify(next),
  ]);
  return next;
}

/**
 * Orquestrador de um ciclo de sincronização (Fase 11): baixa alterações
 * remotas (Fase 7) e envia a fila local (Fase 6) para cada entidade, só
 * quando `canSync` permite. Pensado para ser chamado periodicamente (ou ao
 * reconectar) por quem tiver esse gatilho — nenhum timer/listener de rede
 * é criado aqui.
 */
export async function runSyncCycle({
  driver, uid, uploader, entidades, isPremium, isOnline,
  fetchChangedSince, storage = 'typed', now = Date.now,
}) {
  if (!canSync({ isPremium, isOnline })) {
    return { skipped: true, reason: !isOnline ? 'offline' : 'sem_premium' };
  }

  const startedAt = now();
  const downloads = {};
  for (const entidade of entidades) {
    downloads[entidade] = await downloadRemoteChanges({ driver, uid, entidade, fetchChangedSince, storage });
    await recordSyncCompleted(driver, entidade);
  }

  const upload = await processSyncQueue({ driver, uploader });
  const durationMs = Math.max(0, now() - startedAt);
  const downloadErrors = Object.values(downloads).reduce((total, item) => total + (item?.errors?.length ?? 0), 0);
  const bytesDownloaded = Object.values(downloads).reduce((total, item) => total + (item?.bytesDownloaded ?? 0), 0);
  const queuePending = await countPending(driver);
  const metrics = await recordSyncMetrics(driver, {
    durationMs,
    bytesUploaded: upload.bytesUploaded,
    bytesDownloaded,
    errors: upload.failed + downloadErrors,
    queuePending,
  });

  return { skipped: false, downloads, upload, metrics };
}
