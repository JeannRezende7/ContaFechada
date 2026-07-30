import { listPending, markFailed, markSynced, markSyncing } from './syncQueue.js';

/**
 * Envia o próximo lote de operações pendentes (Fase 6: "Enviar operações em
 * lotes"). Cada operação só some da fila depois que `uploader` confirma —
 * uma falha de rede simplesmente deixa a operação de volta como `pending`
 * (via `markFailed`, com espera progressiva) para a próxima chamada tentar
 * de novo, sem perder nada.
 *
 * @param {Object} params
 * @param {import('../drivers/driver.js').SqlDriver} params.driver
 * @param {{ upsert: (entidade: string, registroId: string, payload: object) => Promise<void>, remove: (entidade: string, registroId: string) => Promise<void> }} params.uploader
 * @param {number} [params.batchSize]
 */
export async function processSyncQueue({ driver, uploader, batchSize = 50 }) {
  const batch = await listPending(driver, { limit: batchSize });
  let succeeded = 0;
  let failed = 0;

  for (const operation of batch) {
    await markSyncing(driver, operation.id);
    try {
      if (operation.operacao === 'delete') {
        await uploader.remove(operation.entidade, operation.registroId);
      } else {
        await uploader.upsert(operation.entidade, operation.registroId, operation.payload);
      }
      await markSynced(driver, operation.id);
      succeeded++;
    } catch (error) {
      await markFailed(driver, operation.id, error);
      failed++;
    }
  }

  return { processed: batch.length, succeeded, failed };
}
