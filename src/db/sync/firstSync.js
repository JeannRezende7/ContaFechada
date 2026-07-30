import { createCategoriasRepository } from '../../repositories/sqlite/categoriasRepository.js';
import { createLancamentosRepository } from '../../repositories/sqlite/lancamentosRepository.js';
import { downloadRemoteChanges } from './downloadRemoteChanges.js';

/**
 * Fase 9 do roadmap local-first: ativar o Premium num aparelho que já tinha
 * dados locais (gratuito) precisa decidir o que fazer com o que já existir
 * na conta na nuvem. Só cobre os domínios que já têm adapter SQLite (Fase
 * 3): categorias e lançamentos.
 */

const SUPPORTED_DOMAINS = ['categorias', 'lancamentos'];

async function readLocal(driver, entidade) {
  if (entidade === 'categorias') return createCategoriasRepository(driver).list();
  return createLancamentosRepository(driver).listAll();
}

function toFirestorePayload(item) {
  const { id: _id, ...payload } = item;
  return payload;
}

function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

/**
 * Heurística de "possível lançamento equivalente": mesmo tipo, valor, data
 * de vencimento e descrição (normalizada), mas ids diferentes — o caso
 * comum de alguém ter lançado a mesma coisa de dois jeitos (uma vez local,
 * uma vez direto pela conta) antes de qualquer sincronização existir.
 * Nunca mescla ou apaga nada sozinha — só sinaliza para o usuário decidir.
 */
export function detectPossibleDuplicateLancamentos(localOnly, remoteOnly) {
  const pares = [];
  for (const local of localOnly) {
    for (const remote of remoteOnly) {
      if (
        local.tipo === remote.tipo &&
        Math.abs((Number(local.valor) || 0) - (Number(remote.valor) || 0)) < 0.005 &&
        local.dataVencimento === remote.dataVencimento &&
        normalize(local.descricao) === normalize(remote.descricao)
      ) {
        pares.push({
          localId: local.id,
          remoteId: remote.id,
          descricao: local.descricao,
          valor: local.valor,
          dataVencimento: local.dataVencimento,
        });
      }
    }
  }
  return pares;
}

/**
 * "Mostrar contagens antes da operação" — nenhuma escrita, só leitura dos
 * dois lados pra decidir enviar / baixar / mesclar com informação.
 */
export async function previewFirstSync({ driver, uid, firebaseRepositories }) {
  const preview = {};

  for (const entidade of SUPPORTED_DOMAINS) {
    const local = (await readLocal(driver, entidade)).filter((item) => !item.deletedAt);
    const remoteRaw =
      entidade === 'categorias'
        ? await firebaseRepositories.categorias.list(uid)
        : await firebaseRepositories.lancamentos.listAll(uid);
    const remote = remoteRaw.filter((item) => !item.deletedAt);

    const localIds = new Set(local.map((item) => item.id));
    const remoteIds = new Set(remote.map((item) => item.id));
    const localOnly = local.filter((item) => !remoteIds.has(item.id));
    const remoteOnly = remote.filter((item) => !localIds.has(item.id));

    preview[entidade] = {
      local: local.length,
      remoto: remote.length,
      somenteLocal: localOnly.length,
      somenteRemoto: remoteOnly.length,
      emAmbos: local.length - localOnly.length,
      possiveisDuplicatas: entidade === 'lancamentos' ? detectPossibleDuplicateLancamentos(localOnly, remoteOnly) : [],
    };
  }

  return preview;
}

/**
 * "Enviar dados deste aparelho" — sobe todo dado local pro Firestore, no
 * mesmo id que já tem localmente. Upload idempotente (mesmo id sempre):
 * uma falha no meio do caminho não perde nada, só chamar de novo retoma —
 * os já enviados são reescritos com os mesmos dados, sem duplicar.
 */
export async function uploadLocalToFirestore({ driver, uploader, batchSize = 50 }) {
  const summary = {};

  for (const entidade of SUPPORTED_DOMAINS) {
    const items = (await readLocal(driver, entidade)).filter((item) => !item.deletedAt);
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.all(batch.map((item) => uploader.upsert(entidade, item.id, toFirestorePayload(item))));
    }
    summary[entidade] = { count: items.length };
  }

  return summary;
}

/**
 * "Baixar dados existentes da conta" — é a mesma operação da Fase 5
 * (`migrateFromFirestore`), reexportada aqui por conveniência de nome; ver
 * aquele módulo para a validação de contagem/soma que ele já faz.
 */
export { migrateFromFirestore as downloadAccountData } from '../migration/migrateFromFirestore.js';

/**
 * "Mesclar os dois conjuntos": baixa o que só existe na nuvem e reconcilia
 * o que existe nos dois lados pela regra "mais recente vence" —
 * reaproveitando a Fase 7 tal e qual (`downloadRemoteChanges` parte do
 * cursor salvo, que é `EPOCH` se este aparelho nunca sincronizou, então
 * naturalmente baixa tudo na primeira vez) — e então sobe o que sobrou só
 * localmente (inclui o que "venceu" um conflito acima, porque subir de
 * novo um registro que não mudou é inofensivo, só reafirma o mesmo dado).
 */
export async function mergeLocalAndRemote({ driver, uid, uploader, fetchChangedSince }) {
  const downloads = {};
  for (const entidade of SUPPORTED_DOMAINS) {
    downloads[entidade] = await downloadRemoteChanges({ driver, uid, entidade, fetchChangedSince });
  }

  const uploads = await uploadLocalToFirestore({ driver, uploader });

  return { downloads, uploads };
}
