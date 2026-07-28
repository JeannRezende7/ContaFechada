import {
  getUserDoc,
  setUserDocMerged,
} from '../../../firebase/firestore.js';

const COLLECTION = 'planejamento';

export async function getPlanejamentoMensal(uid, monthKey) {
  const doc = await getUserDoc(uid, COLLECTION, monthKey);
  return {
    saldoInicial: Number(doc?.saldoInicial) || 0,
    orcamentos: doc?.orcamentos ?? {},
  };
}

export async function setSaldoInicial(uid, monthKey, saldoInicial) {
  await setUserDocMerged(uid, COLLECTION, monthKey, {
    monthKey,
    saldoInicial: Number(saldoInicial) || 0,
  });
}

export async function setOrcamentoCategoria(uid, monthKey, categoriaId, valor, currentBudgets = {}) {
  const orcamentos = { ...currentBudgets };
  const numericValue = Number(valor) || 0;
  if (numericValue > 0) orcamentos[categoriaId] = numericValue;
  else delete orcamentos[categoriaId];

  await setUserDocMerged(uid, COLLECTION, monthKey, { monthKey, orcamentos });
  return orcamentos;
}
