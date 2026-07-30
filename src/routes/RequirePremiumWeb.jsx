import { Capacitor } from '@capacitor/core';
import { Navigate, Outlet } from 'react-router-dom';
import { usePremium } from '../contexts/PremiumContext.jsx';
import { PREMIUM_ENFORCED } from '../config/premium.js';
import LoadingScreen from '../components/ui/LoadingScreen.jsx';
import { shouldBlockWebAccess } from './webPremiumGate.js';

/**
 * Fase 10 do roadmap local-first — ver `webPremiumGate.js` pra regra em si.
 * Usado como rota-layout em `AppRoutes.jsx` em volta dos módulos
 * financeiros; `/opcoes`, `/opcoes/meu-plano` e `/acesso-web` ficam FORA
 * disto de propósito, senão quem precisa assinar não conseguiria nem
 * chegar na tela de assinatura.
 */
export default function RequirePremiumWeb() {
  const { isPremium, loading } = usePremium();
  const isNativePlatform = Capacitor.isNativePlatform();

  if (!isNativePlatform && PREMIUM_ENFORCED && loading) {
    return <LoadingScreen />;
  }

  if (shouldBlockWebAccess({ isNativePlatform, enforced: PREMIUM_ENFORCED, isPremium })) {
    return <Navigate to="/acesso-web" replace />;
  }

  return <Outlet />;
}
