import { getDeviceId } from '../../utils/deviceId.js';

/**
 * Fase 5 do roadmap local-first: copia dados já existentes no Firestore
 * para o SQLite sem perdas. Só cobre os domínios que já têm adapter SQLite
 * (Fase 3, ainda em andamento): categorias e lançamentos. Os outros 8
 * domínios continuam só no Firestore até ganharem adapter próprio.
 *
 * Protações do roadmap aplicadas aqui:
 * - Nunca apaga a origem (este módulo não chama nenhum delete no Firestore).
 * - Repetir a migração não duplica nada — cada linha é gravada com o MESMO
 *   `id` do documento Firestore (`INSERT OR REPLACE`), nunca um id novo.
 * - Tudo grava numa única transação SQLite — interromper o app no meio não
 *   deixa dados parciais (mesma garantia já testada em migrationRunner.js).
 * - Contagem e soma são comparadas origem x destino; qualquer divergência
 *   joga um erro e a migração NÃO é marcada como concluída.
 */

function toIsoString(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

const SUPPORTED_DOMAINS = ['categorias', 'lancamentos'];

/** Bump ao adicionar mais domínios ao conjunto migrado — sinaliza que uma migração já concluída precisa rodar de novo (com `force: true`). */
export const MIGRATION_VERSION = 1;

const MIGRATION_KEY_COMPLETED_AT = 'migration:firestore:completed_at';
const MIGRATION_KEY_VERSION = 'migration:firestore:version';

const DOMAIN_CONFIG = {
  categorias: {
    table: 'categorias',
    sumColumn: null,
    async fetch(uid, firebaseRepositories) {
      return firebaseRepositories.categorias.list(uid);
    },
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
    async fetch(uid, firebaseRepositories) {
      return firebaseRepositories.lancamentos.listAll(uid);
    },
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

export class MigrationValidationError extends Error {
  constructor(mismatches) {
    super(`Divergência na migração: ${JSON.stringify(mismatches)}`);
    this.name = 'MigrationValidationError';
    this.mismatches = mismatches;
  }
}

function summarizeFetched(domain, items) {
  const config = DOMAIN_CONFIG[domain];
  const live = items.filter((item) => !item.deletedAt);
  return {
    count: live.length,
    sum: config.sumColumn ? round2(live.reduce((acc, item) => acc + (Number(item[config.sumColumn]) || 0), 0)) : null,
  };
}

async function summarizeSqlite(domain, driver) {
  const config = DOMAIN_CONFIG[domain];
  const countRow = await driver.get(`SELECT COUNT(*) as count FROM ${config.table} WHERE deleted_at IS NULL`);
  const sum = config.sumColumn
    ? round2(
        (await driver.get(`SELECT COALESCE(SUM(${config.sumColumn}), 0) as sum FROM ${config.table} WHERE deleted_at IS NULL`))
          .sum
      )
    : null;
  return { count: countRow.count, sum };
}

/** `null` se a migração nunca rodou nesta base. */
export async function getFirestoreMigrationState(driver) {
  const completedRow = await driver.get('SELECT valor FROM sync_state WHERE chave = ?', [MIGRATION_KEY_COMPLETED_AT]);
  if (!completedRow) return null;
  const versionRow = await driver.get('SELECT valor FROM sync_state WHERE chave = ?', [MIGRATION_KEY_VERSION]);
  return { completedAt: completedRow.valor, version: Number(versionRow?.valor ?? 0) };
}

/**
 * @param {Object} params
 * @param {import('../drivers/driver.js').SqlDriver} params.driver
 * @param {string} params.uid
 * @param {import('../../repositories/contracts.js').Repositories} params.firebaseRepositories
 * @param {boolean} [params.force] - repete a migração mesmo se já concluída (idempotente: reescreve as mesmas linhas, não duplica).
 */
export async function migrateFromFirestore({ driver, uid, firebaseRepositories, force = false }) {
  const existing = await getFirestoreMigrationState(driver);
  if (existing && !force) {
    return { skipped: true, ...existing };
  }

  // Backup: buscado inteiro antes de qualquer escrita local. Persistir isso
  // como arquivo (ex.: reaproveitando downloadJson de dataPortabilityService)
  // é responsabilidade de quem chama esta função — mantido fora daqui pra
  // este módulo continuar puro e testável sem um navegador.
  const fetched = {};
  const summaryBefore = {};
  for (const domain of SUPPORTED_DOMAINS) {
    const items = await DOMAIN_CONFIG[domain].fetch(uid, firebaseRepositories);
    fetched[domain] = items;
    summaryBefore[domain] = summarizeFetched(domain, items);
  }

  await driver.transaction(async (tx) => {
    for (const domain of SUPPORTED_DOMAINS) {
      const config = DOMAIN_CONFIG[domain];
      for (const item of fetched[domain]) {
        await tx.run(config.insertSql, config.toRow(item));
      }
    }
  });

  const summaryAfter = {};
  const mismatches = [];
  for (const domain of SUPPORTED_DOMAINS) {
    summaryAfter[domain] = await summarizeSqlite(domain, driver);
    const before = summaryBefore[domain];
    const after = summaryAfter[domain];
    const countMismatch = before.count !== after.count;
    const sumMismatch = before.sum != null && Math.abs(before.sum - after.sum) > 0.005;
    if (countMismatch || sumMismatch) mismatches.push({ domain, before, after });
  }

  if (mismatches.length > 0) {
    throw new MigrationValidationError(mismatches);
  }

  const completedAt = new Date().toISOString();
  await driver.run('INSERT OR REPLACE INTO sync_state (chave, valor) VALUES (?, ?)', [
    MIGRATION_KEY_COMPLETED_AT,
    completedAt,
  ]);
  await driver.run('INSERT OR REPLACE INTO sync_state (chave, valor) VALUES (?, ?)', [
    MIGRATION_KEY_VERSION,
    String(MIGRATION_VERSION),
  ]);

  return { skipped: false, completedAt, version: MIGRATION_VERSION, backup: fetched, summary: summaryAfter };
}
