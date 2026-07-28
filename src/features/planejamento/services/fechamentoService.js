import {
  batchUpdateUserDocsWithData,
  getUserDoc,
  setUserDoc,
} from '../../../firebase/firestore.js';
import { construirAdiamentoPendencias } from '../utils/fechamento.js';

const COLLECTION = 'fechamentos';

export function getFechamento(uid, monthKey) {
  return getUserDoc(uid, COLLECTION, monthKey);
}

export async function fecharMes(uid, monthKey, resumo, saldoReal, observacoes, levarPendencias) {
  if (levarPendencias && resumo.pendentes.length > 0) {
    await batchUpdateUserDocsWithData(
      uid,
      'lancamentos',
      construirAdiamentoPendencias(resumo.pendentes, monthKey)
    );
  }
  const snapshot = {
    monthKey,
    status: 'fechado',
    saldoInicial: resumo.saldoCalculado - resumo.receitas + resumo.despesas,
    receitas: resumo.receitas,
    despesas: resumo.despesas,
    saldoCalculado: resumo.saldoCalculado,
    saldoReal,
    diferenca: saldoReal - resumo.saldoCalculado,
    pendenciasNoFechamento: resumo.pendentes.length,
    totalLancamentos: resumo.totalLancamentos,
    observacoes: observacoes || null,
    pendenciasTransferidas: Boolean(levarPendencias),
    fechadoEm: new Date().toISOString(),
  };
  await setUserDoc(uid, COLLECTION, monthKey, snapshot);
  return snapshot;
}
