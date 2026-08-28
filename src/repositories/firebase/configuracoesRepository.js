import * as dashboardService from '../../features/dashboard/services/dashboardService.js';
import * as onboardingService from '../../features/onboarding/services/onboardingService.js';
import { getUserDoc, setUserDocMerged } from '../../firebase/firestore.js';

async function getValorLivreAutomatico(uid) {
  const config = await getUserDoc(uid, 'config', 'geral');
  return {
    enabled: Boolean(config?.valorLivreAutomatico),
    day: Math.min(28, Math.max(1, Number(config?.valorLivreDiaAtualizacao) || 1)),
  };
}

function setValorLivreAutomatico(uid, config) {
  return setUserDocMerged(uid, 'config', 'geral', {
    valorLivreAutomatico: Boolean(config.enabled),
    valorLivreDiaAtualizacao: Math.min(28, Math.max(1, Number(config.day) || 1)),
  });
}

/**
 * Fachada sobre o documento compartilhado `config/geral`. Cada campo continua
 * de posse do serviço de feature que o criou (meta de economia no dashboard,
 * flags de onboarding no onboarding, `gestorUsaMovimento` em
 * `repositories.gestor`) — este repositório só reúne os pontos de acesso
 * num único lugar para as telas não importarem serviços de feature direto.
 *
 * @type {import('../contracts.js').ConfiguracoesRepository}
 */
export const configuracoesRepository = {
  getMetaEconomiaMensal: dashboardService.getMetaEconomiaMensal,
  setMetaEconomiaMensal: dashboardService.setMetaEconomiaMensal,
  getValorLivreAutomatico,
  setValorLivreAutomatico,
  getOnboardingState: onboardingService.getOnboardingState,
  skipOnboarding: onboardingService.skipOnboarding,
  completeOnboarding: onboardingService.completeOnboarding,
};
