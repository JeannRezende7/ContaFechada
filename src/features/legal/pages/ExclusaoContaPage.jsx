import { ArrowLeft, ShieldCheck, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandIcon from '../../../components/ui/BrandIcon.jsx';

export default function ExclusaoContaPage() {
  return (
    <div className="min-h-screen bg-paper px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] dark:bg-ink-900 md:py-12">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-300 transition-colors hover:text-ink-500">
          <ArrowLeft size={15} strokeWidth={2} /> Voltar
        </Link>

        <div className="mb-6 flex items-center gap-2.5">
          <BrandIcon size={36} className="h-9 w-9 shrink-0" />
          <h1 className="font-display text-xl font-semibold text-ink-900 dark:text-ink-50 md:text-2xl">Exclusão de conta — Conta Fechada</h1>
        </div>

        <div className="flex flex-col gap-5 text-sm leading-relaxed text-ink-700 dark:text-ink-100">
          <p className="text-xs italic text-ink-300">Última atualização: 22/08/2026.</p>

          <section className="rounded-card bg-white p-5 shadow-card dark:bg-ink-700">
            <div className="mb-2 flex items-center gap-2"><Smartphone size={17} className="text-ledger-500" /><h2 className="font-display font-semibold">Excluir pelo aplicativo</h2></div>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Abra o Conta Fechada e entre na conta que deseja excluir.</li>
              <li>Acesse <strong>Opções</strong> e depois <strong>Avançado</strong>.</li>
              <li>Em <strong>Zona de perigo</strong>, toque em <strong>Excluir conta</strong>.</li>
              <li>Leia o aviso e confirme a exclusão.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-semibold text-ink-900 dark:text-ink-50">O que é excluído</h2>
            <p>A conta de autenticação, os dados privados ligados à conta e eventuais registros financeiros antigos mantidos nos serviços do Conta Fechada são excluídos. Os dados locais deste aparelho também são apagados pelo fluxo de exclusão.</p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-semibold text-ink-900 dark:text-ink-50">O que pode ser mantido</h2>
            <p>Registros estritamente necessários para comprovar compras, prevenir fraude, cumprir obrigações legais ou atender solicitações da Google Play podem ser conservados pelo prazo exigido. O histórico da compra também permanece sujeito às regras e à retenção da Google Play.</p>
          </section>

          <section>
            <div className="mb-1.5 flex items-center gap-2"><ShieldCheck size={17} className="text-ledger-500" /><h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50">Solicitação fora do aplicativo</h2></div>
            <p>O canal oficial para solicitações externas de exclusão será publicado aqui e na ficha do aplicativo antes do lançamento. Para proteger a conta, poderemos solicitar uma confirmação de identidade antes de concluir o pedido.</p>
          </section>

          <p className="text-xs text-ink-300">A exclusão é permanente e não pode ser desfeita. Exporte um backup local antes, caso queira conservar seus dados financeiros.</p>
        </div>
      </div>
    </div>
  );
}
