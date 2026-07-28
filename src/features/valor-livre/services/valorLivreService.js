import { getUserDoc, setUserDocMerged } from '../../../firebase/firestore.js';

const COLLECTION = 'valorLivre';

export async function getDistribuicaoMensal(uid, monthKey) {
  const documento = await getUserDoc(uid, COLLECTION, monthKey);
  return Array.isArray(documento?.distribuicoes) ? documento.distribuicoes : [];
}

export function setDistribuicaoMensal(uid, monthKey, distribuicoes) {
  const dados = distribuicoes.map(({ id, nome, categoriaId, metaId, valor, percentual, descontaContasFixas }) => ({
    id,
    nome: String(nome || '').trim(),
    categoriaId: categoriaId || '',
    metaId: metaId || '',
    valor: Math.max(0, Number(valor) || 0),
    percentual: Math.max(0, Number(percentual) || 0),
    descontaContasFixas: Boolean(descontaContasFixas),
  }));
  return setUserDocMerged(uid, COLLECTION, monthKey, { monthKey, distribuicoes: dados });
}
