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
  let bytesUploaded = 0;

  for (const operation of batch) {
    await markSyncing(driver, operation.id);
    try {
      if (operation.operacao === 'delete') {
        await uploader.remove(operation.entidade, operation.registroId);
      } else {
        await uploader.upsert(operation.entidade, operation.registroId, operation.payload);
        bytesUploaded += new TextEncoder().encode(JSON.stringify(operation.payload ?? {})).byteLength;
      }
      await markSynced(driver, operation.id);
      const stillQueued = await driver.get(
        'SELECT id FROM sync_queue WHERE entidade=? AND registro_id=? LIMIT 1',
        [operation.entidade, operation.registroId]
      );
      if (!stillQueued) {
        if (operation.operacao === 'delete') {
          await driver.run(
            'DELETE FROM local_documents WHERE dominio=? AND id=? AND deleted_at IS NOT NULL',
            [operation.entidade, operation.registroId]
          );
        } else {
          await driver.run(
            "UPDATE local_documents SET sync_status='synced' WHERE dominio=? AND id=?",
            [operation.entidade, operation.registroId]
          );
        }
      }
      succeeded++;
    } catch (error) {
      await markFailed(driver, operation.id, error);
      failed++;
    }
  }

  return { processed: batch.length, succeeded, failed, bytesUploaded };
}
