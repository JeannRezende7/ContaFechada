import { Link } from 'react-router-dom';
import { Crown, CloudOff } from 'lucide-react';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';

/**
 * Fase 10 do roadmap local-first: destino de quem tenta acessar um módulo
 * financeiro pela Web sem Premium ativo (ver `routes/RequirePremiumWeb.jsx`).
 * Diferencia "nunca assinou" de "assinatura expirada/cancelada" pra não
 * tratar os dois casos com o mesmo texto genérico.
 */
export default function AcessoWebPage() {
  const { subscription } = usePremium();
  const jaFoiAssinante = subscription.status === 'expired' || subscription.status === 'canceled' || subscription.status === 'past_due';

  return (
    <>
      <Topbar title="Acesso web" icon={CloudOff} />
      <div className="mx-auto max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-gold-700">
          <Crown size={22} strokeWidth={1.75} />
        </span>
        <p className="text-base font-semibold text-ink-900 dark:text-ink-50">
          {jaFoiAssinante ? 'Sua assinatura Premium não está mais ativa' : 'O acesso web faz parte do Conta Fechada Premium'}
        </p>
        <p className="mt-2 text-sm text-ink-500">
          {jaFoiAssinante
            ? 'Renove para voltar a acessar seus dados pela web — eles continuam seguros e sincronizados, nada foi apagado.'
            : 'Assine o Premium pelo Android para liberar o acesso web, com os mesmos dados sincronizados nas duas plataformas.'}
        </p>
        <Link
          to="/opcoes/meu-plano"
          className="mt-6 inline-flex items-center gap-2 rounded-pill bg-ledger-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-ledger-600"
        >
          Ver planos
        </Link>
      </div>
    </>
  );
}
