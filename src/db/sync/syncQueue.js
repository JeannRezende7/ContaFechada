import { nextRetryDelayMs } from './backoff.js';

/**
 * Fila de sincronização Premium (Fase 6) sobre a tabela `sync_queue`.
 * Regras do roadmap aplicadas aqui:
 * - A interface nunca espera a nuvem — `enqueue` só grava local, quem chama
 *   segue em frente sem aguardar rede.
 * - Uma operação só sai da fila (`markSynced`) depois de confirmação real
 *   do envio, nunca antes.
 * - Operações pendentes do mesmo registro são consolidadas em vez de
 *   empilhadas — ver `consolidate`.
 */

const MAX_ATTEMPTS = 8;
const VALID_OPERATIONS = new Set(['create', 'update', 'delete']);

function rowToOperation(row) {
  return {
    id: row.id,
    entidade: row.entidade,
    registroId: row.registro_id,
    operacao: row.operacao,
    payload: row.payload ? JSON.parse(row.payload) : null,
    status: row.status,
    tentativas: row.tentativas,
    proximaTentativaEm: row.proxima_tentativa_em,
    createdAt: row.created_at,
    erro: row.erro,
  };
}

/**
 * Decide o resultado de uma nova operação chegando sobre uma já pendente
 * para o mesmo registro — nunca deixa duas entradas pendentes disputando o
 * mesmo `(entidade, registroId)`.
 *
 * - create + update  -> continua create, com o payload mais novo (ainda não
 *   existe na nuvem, então "criar" com os dados atuais já basta).
 * - create + delete  -> remove a entrada: nunca chegou a sair deste
 *   aparelho, não há nada para mandar à nuvem.
 * - update + update  -> continua update, com o payload mais novo.
 * - update + delete  -> vira delete.
 * - delete + qualquer -> continua delete.
 */
function consolidate(existingOperacao, incomingOperacao) {
  if (existingOperacao === 'delete') return { operacao: 'delete', drop: false };
  if (existingOperacao === 'create' && incomingOperacao === 'delete') return { operacao: null, drop: true };
  if (incomingOperacao === 'delete') return { operacao: 'delete', drop: false };
  if (existingOperacao === 'create') return { operacao: 'create', drop: false };
  return { operacao: 'update', drop: false };
}

/** Enfileira uma alteração local. Só consolida contra entradas ainda `pending` — uma já `syncing` termina o envio em curso sem interferência. */
export async function enqueue(driver, { entidade, registroId, operacao, payload }) {
  if (!entidade || !registroId) throw new TypeError('entidade e registroId são obrigatórios');
  if (!VALID_OPERATIONS.has(operacao)) throw new TypeError(`operação de sincronização inválida: ${operacao}`);
  if (operacao !== 'delete' && (!payload || typeof payload !== 'object' || Array.isArray(payload))) {
    throw new TypeError('payload de create/update deve ser um objeto');
  }
  const existing = await driver.get(
    "SELECT * FROM sync_queue WHERE entidade = ? AND registro_id = ? AND status = 'pending'",
    [entidade, registroId]
  );

  if (!existing) {
    await driver.run(
      `INSERT INTO sync_queue (id, entidade, registro_id, operacao, payload, status, tentativas, proxima_tentativa_em, created_at, erro)
       VALUES (?, ?, ?, ?, ?, 'pending', 0, NULL, ?, NULL)`,
      [crypto.randomUUID(), entidade, registroId, operacao, payload ? JSON.stringify(payload) : null, new Date().toISOString()]
    );
    return;
  }

  const { operacao: nextOperacao, drop } = consolidate(existing.operacao, operacao);
  if (drop) {
    await driver.run('DELETE FROM sync_queue WHERE id = ?', [existing.id]);
    return;
  }

  await driver.run('UPDATE sync_queue SET operacao = ?, payload = ? WHERE id = ?', [
    nextOperacao,
    payload ? JSON.stringify(payload) : existing.payload,
    existing.id,
  ]);
}

/** Próximo lote de operações prontas pra envio — pendentes, sem tentativa futura agendada ainda no futuro. */
export async function listPending(driver, { limit = 50 } = {}) {
  const now = new Date().toISOString();
  const rows = await driver.all(
    `SELECT * FROM sync_queue
     WHERE status = 'pending' AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= ?)
     ORDER BY created_at ASC
     LIMIT ?`,
    [now, limit]
  );
  return rows.map(rowToOperation);
}

export async function markSyncing(driver, id) {
  await driver.run("UPDATE sync_queue SET status = 'syncing' WHERE id = ? AND status = 'pending'", [id]);
}

/** Só sai da fila depois de confirmação — nunca antes. */
export async function markSynced(driver, id) {
  await driver.run('DELETE FROM sync_queue WHERE id = ?', [id]);
}

/**
 * Volta pra `pending` com espera progressiva, até `MAX_ATTEMPTS` — daí em
 * diante fica em `error`, parada até uma retentativa manual
 * (`retryFailed`), pra não martelar a rede indefinidamente por um erro
 * permanente (ex.: registro apagado do lado de lá).
 */
export async function markFailed(driver, id, error) {
  const row = await driver.get('SELECT tentativas FROM sync_queue WHERE id = ?', [id]);
  if (!row) return;

  const tentativas = row.tentativas + 1;
  const status = tentativas >= MAX_ATTEMPTS ? 'error' : 'pending';
  const proximaTentativaEm =
    status === 'pending' ? new Date(Date.now() + nextRetryDelayMs(tentativas)).toISOString() : null;

  await driver.run(
    'UPDATE sync_queue SET tentativas = ?, status = ?, proxima_tentativa_em = ?, erro = ? WHERE id = ?',
    [tentativas, status, proximaTentativaEm, error?.message ?? String(error ?? ''), id]
  );
}

/** Repõe uma operação em `error` de volta pra fila, para uma tentativa manual do usuário. */
export async function retryFailed(driver, id) {
  await driver.run(
    "UPDATE sync_queue SET status = 'pending', proxima_tentativa_em = NULL WHERE id = ? AND status = 'error'",
    [id]
  );
}

/**
 * Total ainda não confirmado — para mostrar "N alterações pendentes" na UI
 * (Fase 6). Toda linha que ainda existe em `sync_queue` é, por construção,
 * não sincronizada — `markSynced` remove a linha em vez de marcar um status.
 */
export async function countPending(driver) {
  const row = await driver.get('SELECT COUNT(*) as count FROM sync_queue');
  return row.count;
}
