import { countPending } from './syncQueue.js';
import { listConflictLog } from './downloadRemoteChanges.js';
import { getLastSyncAt, getSyncMetrics } from './runSyncCycle.js';

/**
 * Fase 13 do roadmap local-first: saúde de sincronização DESTE aparelho —
 * a versão local de métricas como "tamanho da fila", "taxa de conflito" e
 * "última sincronização" (reaproveita `countPending` da Fase 6,
 * `listConflictLog` da Fase 7 e `getLastSyncAt` da Fase 11).
 *
 * As métricas agregadas entre todos os usuários que o roadmap também pede
 * (conversão gratuito → Premium, custo Firebase por assinante, retenção em
 * 7/30 dias, alertas de orçamento no Google Cloud) dependem de acesso ao
 * Firebase Analytics/BigQuery/GCP Console — nada disso está disponível
 * neste ambiente de desenvolvimento, e não têm código correspondente aqui.
 */
export async function getSyncHealth({ driver, entidades }) {
  const [filaPendente, conflitosRecentes, metricas, queueStatusRows] = await Promise.all([
    countPending(driver),
    listConflictLog(driver, { limit: 20 }),
    getSyncMetrics(driver),
    driver.all('SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status'),
  ]);

  const ultimaSincronizacaoPorEntidade = {};
  for (const entidade of entidades) {
    ultimaSincronizacaoPorEntidade[entidade] = await getLastSyncAt(driver, entidade);
  }

  const filaPorStatus = Object.fromEntries(queueStatusRows.map((row) => [row.status, row.count]));
  const duracaoMediaMs = metricas.cycles ? Math.round(metricas.durationMsTotal / metricas.cycles) : null;
  const lastThree = (metricas.recentSamples ?? []).slice(-3);
  const filaCrescendo =
    lastThree.length === 3 &&
    lastThree[0].queuePending < lastThree[1].queuePending &&
    lastThree[1].queuePending < lastThree[2].queuePending;
  const alertas = [
    ...(filaCrescendo ? [{ type: 'queue_growth', severity: 'warning', message: 'A fila cresceu nos últimos 3 ciclos.' }] : []),
    ...((filaPorStatus.error ?? 0) > 0
      ? [{ type: 'queue_errors', severity: 'error', message: `${filaPorStatus.error} operação(ões) exige(m) nova tentativa.` }]
      : []),
  ];

  return {
    filaPendente,
    filaPorStatus,
    conflitosRecentes,
    ultimaSincronizacaoPorEntidade,
    metricas: { ...metricas, duracaoMediaMs },
    alertas,
  };
}
