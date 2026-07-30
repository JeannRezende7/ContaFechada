import { getDeviceId } from '../utils/deviceId.js';

/**
 * Mapeamento de um doc Firestore pra uma linha SQLite, compartilhado entre
 * a migração inicial (Fase 5, `migration/migrateFromFirestore.js`) e o
 * download de alterações remotas (Fase 7, `sync/downloadRemoteChanges.js`)
 * — ambos gravam a mesma forma de linha, só mudam de onde os dados vêm.
 * Só cobre os domínios que já têm adapter SQLite (Fase 3): categorias e
 * lançamentos.
 */

export function toIsoString(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

export const DOMAIN_ROW_CONFIG = {
  categorias: {
    table: 'categorias',
    sumColumn: null,
    insertSql: `INSERT OR REPLACE INTO categorias
      (id, nome, tipo, cor_key, icone, padrao, ordem, created_at, updated_at, deleted_at, device_id, sync_status, local_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
    toRow(item) {
      const now = new Date().toISOString();
      return [
        item.id,
        item.nome,
        item.tipo,
        item.corKey,
        item.icone,
        item.padrao ? 1 : 0,
        item.ordem,
        toIsoString(item.createdAt) ?? now,
        toIsoString(item.updatedAt) ?? now,
        toIsoString(item.deletedAt),
        item.deviceId ?? getDeviceId(),
        item.localVersion ?? 1,
      ];
    },
  },
  lancamentos: {
    table: 'lancamentos',
    sumColumn: 'valor',
    insertSql: `INSERT OR REPLACE INTO lancamentos
      (id, tipo, descricao, valor, data_vencimento, data_pagamento, status, observacoes, categoria_id,
       origem_recorrencia_id, mes_referencia, parcelamento_id, parcela_atual, total_parcelas,
       created_at, updated_at, deleted_at, device_id, sync_status, local_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
    toRow(item) {
      const now = new Date().toISOString();
      return [
        item.id,
        item.tipo,
        item.descricao,
        item.valor,
        item.dataVencimento,
        item.dataPagamento ?? null,
        item.status,
        item.observacoes ?? null,
        item.categoriaId ?? null,
        item.origemRecorrenciaId ?? null,
        item.mesReferencia ?? null,
        item.parcelamentoId ?? null,
        item.parcelaAtual ?? null,
        item.totalParcelas ?? null,
        toIsoString(item.createdAt) ?? now,
        toIsoString(item.updatedAt) ?? now,
        toIsoString(item.deletedAt),
        item.deviceId ?? getDeviceId(),
        item.localVersion ?? 1,
      ];
    },
  },
};
