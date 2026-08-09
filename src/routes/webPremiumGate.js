/**
 * Fase 10 do roadmap local-first: na Web, os módulos financeiros são
 * exclusivos de quem tem Premium ativo — o Android gratuito continua
 * liberado (ver docs/ROADMAP_LOCAL_FIRST_PREMIUM.md). Extraído do componente de
 * rota (`RequirePremiumWeb.jsx`) pra poder ser testado sem montar
 * React/react-router — este projeto não tem harness de teste de
 * componente (jsdom/Testing Library) configurado, só testes de lógica.
 *
 * Respeita o mesmo `PREMIUM_ENFORCED` que já controla todo o resto do
 * gating do projeto (limites de categorias/recorrências/etc): enquanto
 * estiver `false`, ninguém é bloqueado por aqui.
 */
export function shouldBlockWebAccess({ isNativePlatform, enforced, isPremium }) {
  if (isNativePlatform) return false;
  if (!enforced) return false;
  return !isPremium;
}
