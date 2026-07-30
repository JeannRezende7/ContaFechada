import { getDeviceId } from '../../utils/deviceId.js';
import { monthRangeBounds } from '../../utils/monthKey.js';

/**
 * Adapter SQLite do contrato `LancamentosRepository` (ver `../contracts.js`)
 * — Fase 3, primeiro corte. Implementa só o CRUD e as consultas por
 * período, o subconjunto que o roadmap aponta como suficiente pra validar
 * o modelo local-first (junto com categorias). Ainda NÃO portados pra
 * SQLite (continuam existindo só no adapter Firebase):
 * `setCategoriaForRecorrencia`, `updateGeneratedFromRecorrencia`,
 * `removeGeneratedFromRecorrencia`, `createParcelamento`, `importLancamentos`,
 * `updateEmMassa`, `removeByIds`. Portar esse restante fica para quando o
 * provider realmente alternar para SQLite (fora do escopo desta rodada).
 *
 * `uid` fica em cada assinatura só por compatibilidade com o adapter
 * Firebase — o SQLite local não filtra por usuário.
 */
function rowToLancamento(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    descricao: row.descricao,
    valor: row.valor,
    dataVencimento: row.data_vencimento,
    dataPagamento: row.data_pagamento,
    status: row.status,
    observacoes: row.observacoes,
    categoriaId: row.categoria_id,
    origemRecorrenciaId: row.origem_recorrencia_id,
    mesReferencia: row.mes_referencia,
    parcelamentoId: row.parcelamento_id,
    parcelaAtual: row.parcela_atual,
    totalParcelas: row.total_parcelas,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    deviceId: row.device_id,
    syncStatus: row.sync_status,
    localVersion: row.local_version,
  };
}

/** @param {import('../../db/drivers/driver.js').SqlDriver} driver */
export function createLancamentosRepository(driver) {
  async function listByRange(_uid, gte, lte) {
    const rows = await driver.all(
      'SELECT * FROM lancamentos WHERE deleted_at IS NULL AND data_vencimento >= ? AND data_vencimento <= ? ORDER BY data_vencimento ASC',
      [gte, lte]
    );
    return rows.map(rowToLancamento);
  }

  function listByMonth(uid, monthKey) {
    const { gte, lte } = monthRangeBounds(monthKey);
    return listByRange(uid, gte, lte);
  }

  async function listAll(_uid) {
    const rows = await driver.all('SELECT * FROM lancamentos WHERE deleted_at IS NULL');
    return rows.map(rowToLancamento);
  }

  async function hasAny(_uid) {
    const row = await driver.get('SELECT id FROM lancamentos WHERE deleted_at IS NULL LIMIT 1');
    return row !== null;
  }

  async function create(_uid, data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await driver.run(
      `INSERT INTO lancamentos
         (id, tipo, descricao, valor, data_vencimento, data_pagamento, status, observacoes,
          categoria_id, origem_recorrencia_id, mes_referencia, parcelamento_id, parcela_atual, total_parcelas,
          created_at, updated_at, deleted_at, device_id, sync_status, local_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'local', 1)`,
      [
        id,
        data.tipo,
        data.descricao,
        data.valor,
        data.dataVencimento,
        data.dataPagamento ?? null,
        data.status,
        data.observacoes ?? null,
        data.categoriaId ?? null,
        data.origemRecorrenciaId ?? null,
        data.mesReferencia ?? null,
        data.parcelamentoId ?? null,
        data.parcelaAtual ?? null,
        data.totalParcelas ?? null,
        now,
        now,
        getDeviceId(),
      ]
    );
    return id;
  }

  /**
   * Only the fields the UI actually edits today are accepted here (same
   * subset `updateLancamento`/`setLancamentoStatus` write in the Firebase
   * adapter). `sync_status` moves 'synced' -> 'pending' (a local edit still
   * needs uploading); 'local' stays 'local' (never uploaded yet).
   */
  async function update(_uid, id, data) {
    const fields = [];
    const values = [];
    const columnByKey = {
      tipo: 'tipo',
      descricao: 'descricao',
      valor: 'valor',
      dataVencimento: 'data_vencimento',
      dataPagamento: 'data_pagamento',
      status: 'status',
      observacoes: 'observacoes',
      categoriaId: 'categoria_id',
    };
    for (const [key, column] of Object.entries(columnByKey)) {
      if (key in data) {
        fields.push(`${column} = ?`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return;

    await driver.run(
      `UPDATE lancamentos
       SET ${fields.join(', ')},
           updated_at = ?,
           sync_status = CASE WHEN sync_status = 'synced' THEN 'pending' ELSE sync_status END,
           local_version = local_version + 1
       WHERE id = ?`,
      [...values, new Date().toISOString(), id]
    );
  }

  function setStatus(uid, id, status) {
    return update(uid, id, { status });
  }

  async function remove(_uid, id) {
    await driver.run('DELETE FROM lancamentos WHERE id = ?', [id]);
  }

  async function removeAll(_uid) {
    await driver.run('DELETE FROM lancamentos');
  }

  return { listByMonth, listAll, listByRange, hasAny, create, update, setStatus, remove, removeAll };
}
