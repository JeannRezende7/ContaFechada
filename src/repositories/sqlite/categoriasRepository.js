import { DEFAULT_CATEGORIAS } from '../../features/categorias/data/defaultCategorias.js';
import { getDeviceId } from '../../utils/deviceId.js';
import { slugify } from '../../utils/slugify.js';

/**
 * Adapter SQLite do contrato `CategoriasRepository` (ver `../contracts.js`).
 * `uid` fica no parâmetro de cada função só por compatibilidade de
 * assinatura com o adapter Firebase — o banco SQLite local é de um único
 * aparelho, então não filtra por usuário.
 *
 * `syncStatus` nasce `'local'` (nunca foi enviado) e vira `'pending'` a
 * partir da primeira edição de um registro já `'synced'` — a fila de envio
 * de verdade (que consome esse estado) é a Fase 6.
 */
function rowToCategoria(row) {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    corKey: row.cor_key,
    icone: row.icone,
    padrao: Boolean(row.padrao),
    ordem: row.ordem,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    deviceId: row.device_id,
    syncStatus: row.sync_status,
    localVersion: row.local_version,
  };
}

/** @param {import('../../db/drivers/driver.js').SqlDriver} driver */
export function createCategoriasRepository(driver) {
  async function list(_uid) {
    const rows = await driver.all('SELECT * FROM categorias WHERE deleted_at IS NULL ORDER BY ordem ASC');
    return rows.map(rowToCategoria);
  }

  async function create(_uid, data, { id = crypto.randomUUID(), padrao = false } = {}) {
    const now = new Date().toISOString();
    await driver.run(
      `INSERT INTO categorias
         (id, nome, tipo, cor_key, icone, padrao, ordem, created_at, updated_at, deleted_at, device_id, sync_status, local_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'local', 1)`,
      [id, data.nome, data.tipo, data.corKey, data.icone, padrao ? 1 : 0, data.ordem, now, now, getDeviceId()]
    );
    return id;
  }

  async function remove(_uid, id) {
    await driver.run('DELETE FROM categorias WHERE id = ?', [id]);
  }

  async function removeAll(_uid) {
    await driver.run('DELETE FROM categorias');
  }

  /** Same deterministic ids as `categoriasService.ensureDefaultCategorias` — seeding twice (once local, once via Fase 5 migration) never duplicates. */
  async function ensureDefaults(uid) {
    const existing = await list(uid);
    if (existing.length > 0) return existing;

    for (const categoria of DEFAULT_CATEGORIAS) {
      const id = slugify(`${categoria.tipo}-${categoria.nome}`);
      await create(uid, categoria, { id, padrao: true });
    }
    return list(uid);
  }

  return { list, create, remove, removeAll, ensureDefaults };
}
