import { getUserDoc, listUserDocs, setUserDocMerged } from '../../../firebase/firestore.js';
import { getCurrentMonthKey } from '../../../utils/monthKey.js';

const COLLECTION = 'valorLivre';
const DEFAULT_ID = '_padrao';

const rows = (documento) => Array.isArray(documento?.distribuicoes) ? documento.distribuicoes : [];

export async function getDistribuicao(uid, monthKey) {
  const [mensal, padrao] = await Promise.all([
    getUserDoc(uid, COLLECTION, monthKey),
    getUserDoc(uid, COLLECTION, DEFAULT_ID),
  ]);
  if (mensal?.personalizada) return { distribuicoes: rows(mensal), personalizada: true };
  if (rows(padrao).length) return { distribuicoes: rows(padrao), personalizada: false };

  // Compatibilidade com distribuicoes criadas antes da regra global: usa a
  // mais recente como padrao, para que agosto tambem apareca nos outros meses.
  const legados = (await listUserDocs(uid, COLLECTION))
    .filter((item) => /^\d{4}-\d{2}$/.test(item.id) && rows(item).length)
    .sort((a, b) => b.id.localeCompare(a.id));
  return { distribuicoes: rows(legados[0]), personalizada: false };
}

export async function getDistribuicaoMensal(uid, monthKey) {
  return (await getDistribuicao(uid, monthKey)).distribuicoes;
}

export async function getValorBaseMensal(uid, monthKey) {
  const documento = await getUserDoc(uid, COLLECTION, monthKey);
  return documento?.valorBaseMensal !== null && documento?.valorBaseMensal !== undefined
    && Number.isFinite(Number(documento.valorBaseMensal))
    ? Number(documento.valorBaseMensal) : null;
}

export async function setValorBaseMensal(uid, monthKey, valor) {
  const valorBaseMensal = Math.round((Number(valor) || 0) * 100) / 100;
  await setUserDocMerged(uid, COLLECTION, monthKey, {
    monthKey,
    valorBaseMensal,
    valorBaseDefinidoEm: new Date().toISOString(),
  });
  return valorBaseMensal;
}

export async function ensureValorBaseMensal(uid, monthKey, valorCalculado) {
  const existente = await getValorBaseMensal(uid, monthKey);
  if (existente !== null) return existente;
  // Meses futuros podem ser consultados pela navegacao, mas a fotografia so
  // deve ser persistida quando o mes realmente comecar.
  if (monthKey > getCurrentMonthKey()) {
    return Math.round((Number(valorCalculado) || 0) * 100) / 100;
  }
  return setValorBaseMensal(uid, monthKey, valorCalculado);
}

export async function getFotografiaMensal(uid, monthKey) {
  const documento = await getUserDoc(uid, COLLECTION, monthKey);
  const valorBaseMensal = await getValorBaseMensal(uid, monthKey);
  const gastosIniciaisDefinidos = Boolean(
    documento?.gastosIniciais && typeof documento.gastosIniciais === 'object'
  );
  return {
    valorBaseMensal,
    gastosIniciaisDefinidos,
    gastosIniciais: gastosIniciaisDefinidos
      ? documento.gastosIniciais : {},
    movimentoAtualizadoEm: documento?.movimentoAtualizadoEm ?? null,
  };
}

export async function setValorBaseDoMovimento(uid, monthKey, valor, gastosIniciais = {}) {
  const valorBaseMensal = Math.round((Number(valor) || 0) * 100) / 100;
  const movimentoAtualizadoEm = new Date().toISOString();
  await setUserDocMerged(uid, COLLECTION, monthKey, {
    monthKey, valorBaseMensal, gastosIniciais, movimentoAtualizadoEm,
    valorBaseDefinidoEm: movimentoAtualizadoEm,
  });
  return { valorBaseMensal, gastosIniciais, movimentoAtualizadoEm };
}

export async function ensureFotografiaMensal(uid, monthKey, valorCalculado, gastosIniciais = {}) {
  const existente = await getFotografiaMensal(uid, monthKey);
  if (existente.valorBaseMensal !== null && existente.gastosIniciaisDefinidos) return existente;
  if (existente.valorBaseMensal !== null) {
    // Migra fotografias criadas antes de os gastos iniciais por categoria
    // fazerem parte do registro, evitando que sejam descontados duas vezes.
    await setUserDocMerged(uid, COLLECTION, monthKey, { gastosIniciais });
    return { ...existente, gastosIniciais, gastosIniciaisDefinidos: true };
  }
  const valorBaseMensal = Math.round((Number(valorCalculado) || 0) * 100) / 100;
  if (monthKey > getCurrentMonthKey()) return { valorBaseMensal, gastosIniciais, gastosIniciaisDefinidos: true };
  await setUserDocMerged(uid, COLLECTION, monthKey, {
    monthKey, valorBaseMensal, gastosIniciais, valorBaseDefinidoEm: new Date().toISOString(),
  });
  return { valorBaseMensal, gastosIniciais, gastosIniciaisDefinidos: true };
}

export function setDistribuicaoMensal(uid, monthKey, distribuicoes) {
  return setDistribuicao(uid, monthKey, distribuicoes, false);
}

export function setDistribuicao(uid, monthKey, distribuicoes, personalizada = false) {
  const dados = distribuicoes.map(({ id, nome, categoriaId, metaId, valor, percentual, descontaContasFixas }) => ({
    id,
    nome: String(nome || '').trim(),
    categoriaId: categoriaId || '',
    metaId: metaId || '',
    valor: Math.max(0, Number(valor) || 0),
    percentual: Math.max(0, Number(percentual) || 0),
    descontaContasFixas: Boolean(descontaContasFixas),
  }));
  const docId = personalizada ? monthKey : DEFAULT_ID;
  return setUserDocMerged(uid, COLLECTION, docId, {
    monthKey: personalizada ? monthKey : null,
    personalizada: Boolean(personalizada),
    distribuicoes: dados,
  });
}
