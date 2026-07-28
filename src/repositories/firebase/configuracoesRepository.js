import * as dashboardService from '../../features/dashboard/services/dashboardService.js';
import * as onboardingService from '../../features/onboarding/services/onboardingService.js';

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
  getOnboardingState: onboardingService.getOnboardingState,
  skipOnboarding: onboardingService.skipOnboarding,
  completeOnboarding: onboardingService.completeOnboarding,
};
