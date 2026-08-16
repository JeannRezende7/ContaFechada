import { Link } from 'react-router-dom';
import { CloudOff } from 'lucide-react';
import Topbar from '../../../components/layout/Topbar.jsx';

/**
 * Fase 10 do roadmap local-first: destino de quem tenta acessar um módulo
 * financeiro pela Web sem Premium ativo (ver `routes/RequirePremiumWeb.jsx`).
 * Diferencia "nunca assinou" de "assinatura expirada/cancelada" pra não
 * tratar os dois casos com o mesmo texto genérico.
 */
export default function AcessoWebPage() {
  return (
    <>
      <Topbar title="Acesso web" icon={CloudOff} />
      <div className="mx-auto max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-gold-700">
          <CloudOff size={22} strokeWidth={1.75} />
        </span>
        <p className="text-base font-semibold text-ink-900 dark:text-ink-50">
          O acesso web não está disponível nesta versão
        </p>
        <p className="mt-2 text-sm text-ink-500">
          Para manter seus dados seguros no lançamento inicial, o aplicativo funciona somente no celular. O Premium oferece backup diário na nuvem, sem sincronização entre dispositivos.
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
