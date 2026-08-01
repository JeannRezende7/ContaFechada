import { getUserDoc, hasAnyUserDoc, setUserDocMerged } from '../../../firebase/firestore.js';
import { ensureDefaultCategorias } from '../../categorias/services/categoriasService.js';
import { createRecorrencia, listRecorrencias } from '../../recorrencias/services/recorrenciasService.js';
import { getCurrentMonthKey } from '../../../utils/monthKey.js';

export async function getOnboardingState(uid) {
  const config = await getUserDoc(uid, 'config', 'geral');
  if (config?.onboardingConcluido || config?.onboardingPulado) {
    return { completed: Boolean(config.onboardingConcluido), skipped: Boolean(config.onboardingPulado) };
  }
  // Accounts that already used the app before onboarding existed should not
  // be interrupted by a first-access wizard after an update.
  const hasExistingData = (await Promise.all([
    hasAnyUserDoc(uid, 'lancamentos'),
    hasAnyUserDoc(uid, 'recorrencias'),
    hasAnyUserDoc(uid, 'metas'),
  ])).some(Boolean);
  if (hasExistingData) {
    await setUserDocMerged(uid, 'config', 'geral', { onboardingPulado: true });
    return { completed: false, skipped: true };
  }
  return { completed: false, skipped: false };
}

export function skipOnboarding(uid) {
  return setUserDocMerged(uid, 'config', 'geral', { onboardingPulado: true });
}

export async function completeOnboarding(uid, data) {
  const [categories, existingRecurrences] = await Promise.all([
    ensureDefaultCategorias(uid), listRecorrencias(uid),
  ]);
  const monthKey = getCurrentMonthKey();
  const writes = [];
  if (Number(data.incomeValue) > 0 && !existingRecurrences.some((item) => item.tipo === 'receita')) writes.push(createRecorrencia(uid, {
    tipo: 'receita', descricao: data.incomeDescription || 'Renda principal', valor: Number(data.incomeValue),
    diaVencimento: Number(data.incomeDay) || 5, mesInicio: monthKey,
    categoriaId: categories.find((item) => item.tipo === 'receita')?.id ?? null, observacoes: 'Criado no onboarding.',
  }));
  if (Number(data.expenseValue) > 0 && !existingRecurrences.some((item) => item.tipo === 'despesa')) writes.push(createRecorrencia(uid, {
    tipo: 'despesa', descricao: data.expenseDescription || 'Conta recorrente', valor: Number(data.expenseValue),
    diaVencimento: Number(data.expenseDay) || 10, mesInicio: monthKey,
    categoriaId: categories.find((item) => item.tipo === 'despesa')?.id ?? null, observacoes: 'Criado no onboarding.',
  }));
  await Promise.all(writes);
  await setUserDocMerged(uid, 'config', 'geral', {
    onboardingConcluido: true, onboardingPulado: false, onboardingConcluidoEm: new Date().toISOString(),
  });
}
