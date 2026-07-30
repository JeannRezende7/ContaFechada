import { countPending } from './syncQueue.js';
import { listConflictLog } from './downloadRemoteChanges.js';
import { getLastSyncAt } from './runSyncCycle.js';

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
  const [filaPendente, conflitosRecentes] = await Promise.all([
    countPending(driver),
    listConflictLog(driver, { limit: 20 }),
  ]);

  const ultimaSincronizacaoPorEntidade = {};
  for (const entidade of entidades) {
    ultimaSincronizacaoPorEntidade[entidade] = await getLastSyncAt(driver, entidade);
  }

  return { filaPendente, conflitosRecentes, ultimaSincronizacaoPorEntidade };
}
