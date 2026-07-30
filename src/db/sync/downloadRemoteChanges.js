import { listUserDocsUpdatedSince } from '../../firebase/firestore.js';
import { DOMAIN_ROW_CONFIG, toIsoString } from '../domainRowMappers.js';

/**
 * Fase 7 do roadmap local-first: traz alterações remotas (feitas em outro
 * aparelho, ou pela migração da Fase 5) para o SQLite local. Só cobre os
 * domínios que já têm adapter SQLite (Fase 3): categorias e lançamentos.
 * Os "casos especiais" do roadmap (aportes em metas, fechamentos
 * imutáveis, recorrências editadas em dois aparelhos, exclusão de
 * categoria em uso, importação repetida de extrato) dependem de domínios
 * que ainda não existem em SQLite — nenhuma lógica especulativa para eles
 * foi escrita aqui.
 */

const EPOCH = '1970-01-01T00:00:00.000Z';

function cursorKey(entidade) {
  return `cursor:${entidade}`;
}

/** Timestamp (`updatedAt`) do registro mais recente já aplicado para esta coleção — `EPOCH` se nunca sincronizou. */
export async function getCursor(driver, entidade) {
  const row = await driver.get('SELECT valor FROM sync_state WHERE chave = ?', [cursorKey(entidade)]);
  return row?.valor ?? EPOCH;
}

async function recordConflict(tx, entidade, registroId, motivo, detalhes) {
  await tx.run(
    'INSERT INTO conflict_log (id, entidade, registro_id, motivo, detalhes, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
    [crypto.randomUUID(), entidade, registroId, motivo, JSON.stringify(detalhes), new Date().toISOString()]
  );
}

/**
 * @param {Object} params
 * @param {import('../drivers/driver.js').SqlDriver} params.driver
 * @param {string} params.uid
 * @param {'categorias'|'lancamentos'} params.entidade
 * @param {number} [params.maxClockSkewMs] - um `updatedAt` remoto mais no
 *   futuro que isso (a partir de agora) é tratado como relógio incorreto do
 *   aparelho de origem: registrado em `conflict_log`, mas não aplicado —
 *   um relógio adiantado não pode fazer uma edição antiga parecer "mais
 *   recente" e vencer indevidamente.
 * @param {(entidade: string, sinceIso: string) => Promise<object[]>} [params.fetchChangedSince] -
 *   injeção para teste; em produção usa `listUserDocsUpdatedSince` do Firestore.
 */
export async function downloadRemoteChanges({ driver, uid, entidade, maxClockSkewMs = 5 * 60 * 1000, fetchChangedSince }) {
  const config = DOMAIN_ROW_CONFIG[entidade];
  const fetcher = fetchChangedSince ?? ((ent, since) => listUserDocsUpdatedSince(uid, ent, since));

  const cursor = await getCursor(driver, entidade);
  const remoteItems = await fetcher(entidade, cursor);

  const now = Date.now();
  const conflicts = [];
  let applied = 0;
  let newestSeen = cursor;

  await driver.transaction(async (tx) => {
    for (const remote of remoteItems) {
      const updatedAtIso = toIsoString(remote.updatedAt) ?? new Date().toISOString();

      if (new Date(updatedAtIso).getTime() - now > maxClockSkewMs) {
        const conflict = { id: remote.id, motivo: 'relogio_incorreto', updatedAt: updatedAtIso };
        conflicts.push(conflict);
        await recordConflict(tx, entidade, remote.id, conflict.motivo, { updatedAt: updatedAtIso });
        continue;
      }

      const local = await tx.get(`SELECT * FROM ${config.table} WHERE id = ?`, [remote.id]);
      if (local && new Date(local.updated_at).getTime() > new Date(updatedAtIso).getTime()) {
        // "Alteração mais recente vence": a edição local ainda não subiu é
        // mais nova que o que a nuvem tem — mantém a local (ela vai
        // reenviar pela fila de sync, Fase 6) e só registra o conflito.
        const conflict = { id: remote.id, motivo: 'local_mais_novo', local: local.updated_at, remoto: updatedAtIso };
        conflicts.push(conflict);
        await recordConflict(tx, entidade, remote.id, conflict.motivo, { local: local.updated_at, remoto: updatedAtIso });
        continue;
      }

      await tx.run(config.insertSql, config.toRow(remote));
      applied++;
      if (updatedAtIso > newestSeen) newestSeen = updatedAtIso;
    }

    if (newestSeen !== cursor) {
      await tx.run('INSERT OR REPLACE INTO sync_state (chave, valor) VALUES (?, ?)', [cursorKey(entidade), newestSeen]);
    }
  });

  return { applied, conflicts, cursor: newestSeen };
}

/** Ferramenta interna de diagnóstico (Fase 7): últimos conflitos registrados, mais recentes primeiro. */
export async function listConflictLog(driver, { entidade, limit = 50 } = {}) {
  const rows = entidade
    ? await driver.all('SELECT * FROM conflict_log WHERE entidade = ? ORDER BY criado_em DESC LIMIT ?', [entidade, limit])
    : await driver.all('SELECT * FROM conflict_log ORDER BY criado_em DESC LIMIT ?', [limit]);

  return rows.map((row) => ({
    id: row.id,
    entidade: row.entidade,
    registroId: row.registro_id,
    motivo: row.motivo,
    detalhes: row.detalhes ? JSON.parse(row.detalhes) : null,
    criadoEm: row.criado_em,
  }));
}
