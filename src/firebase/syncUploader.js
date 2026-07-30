import { deleteUserDoc, setUserDoc } from './firestore.js';

/**
 * Adapter de produção — liga a interface genérica de upload da fila de
 * sincronização (Fase 6, `db/sync/processSyncQueue.js`) às mesmas funções
 * do Firestore que o resto do app já usa (e que os testes de Fase 1/2 já
 * cobrem). Escrever com `setUserDoc` em vez de `createUserDoc` é o que
 * torna o envio seguro pra repetir: grava no id que o registro já tem
 * localmente, nunca gera um id novo do lado do Firestore.
 *
 * @param {string} uid
 * @returns {{ upsert: (entidade: string, registroId: string, payload: object) => Promise<void>, remove: (entidade: string, registroId: string) => Promise<void> }}
 */
export function createFirestoreSyncUploader(uid) {
  return {
    upsert: (entidade, registroId, payload) => setUserDoc(uid, entidade, registroId, payload),
    remove: (entidade, registroId) => deleteUserDoc(uid, entidade, registroId),
  };
}
