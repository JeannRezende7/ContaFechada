import { Link } from 'react-router-dom';
import { ArrowLeft, PiggyBank } from 'lucide-react';

/**
 * RASCUNHO (ROADMAP_MONETIZACAO.txt, Fase 11) — escrito a partir do que o
 * app efetivamente faz hoje: Firebase Authentication (login Google) +
 * Cloud Firestore (dados financeiros), sem Analytics/Functions/Storage
 * ainda em uso além do que está descrito abaixo. NÃO é aconselhamento
 * jurídico — precisa de revisão à luz da LGPD antes do lançamento público.
 */
export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-paper dark:bg-ink-900 px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-ink-500 mb-6 transition-colors">
          <ArrowLeft size={15} strokeWidth={2} />
          Voltar
        </Link>

        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-9 h-9 rounded-lg bg-ledger-500 flex items-center justify-center shrink-0">
            <PiggyBank size={18} className="text-white" strokeWidth={1.75} />
          </span>
          <h1 className="font-display text-xl md:text-2xl font-semibold text-ink-900 dark:text-ink-50">
            Política de Privacidade — Conta Fechada
          </h1>
        </div>

        <div className="flex flex-col gap-5 text-sm text-ink-700 dark:text-ink-100 leading-relaxed">
          <p className="text-xs text-ink-300 italic">
            Rascunho — versão 18/07/2026. Este texto ainda não passou por revisão jurídica à luz da LGPD.
          </p>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">1. Quais dados coletamos</h2>
            <p>
              Nome, e-mail e foto de perfil (via login com Google), e os dados financeiros que você cadastra:
              lançamentos, categorias, recorrências, metas e as configurações do app. Se você assinar o Premium,
              também guardamos o status da sua assinatura (plano, período pago, se veio da Google Play ou da Web) —
              nunca dados de cartão, que ficam só com o processador de pagamento (MercadoPago) ou a Google Play.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">2. Onde os dados ficam</h2>
            <p>
              Autenticação: Firebase Authentication (Google). Dados financeiros: Cloud Firestore (Google Cloud),
              vinculados exclusivamente à sua conta — nenhum outro usuário tem acesso a eles.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">3. Com quem compartilhamos</h2>
            <p>
              Não vendemos nem compartilhamos seus dados financeiros com terceiros para fins de publicidade. Dados
              são compartilhados apenas com os provedores necessários para o funcionamento do serviço: Google
              Firebase (infraestrutura), e — apenas para quem assina o Premium — o processador de pagamento
              (MercadoPago) ou a Google Play, só com o necessário para processar a cobrança.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">4. Seus direitos (LGPD)</h2>
            <p>Você pode, a qualquer momento, direto no app (em Opções):</p>
            <ul className="list-disc pl-5 mt-1.5 flex flex-col gap-1">
              <li>Exportar uma cópia de todos os seus dados pessoais em formato legível.</li>
              <li>Excluir permanentemente sua conta e todos os dados associados.</li>
            </ul>
            <p className="mt-1.5">
              Para outras solicitações (correção, portabilidade, informações sobre uso de dados):{' '}
              <span className="italic">canal de contato a definir</span> (ROADMAP_MONETIZACAO.txt, Fase 11 — pendente).
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">5. Retenção de dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta existir. Ao excluir a conta, os dados são apagados
              permanentemente do Firestore e sua conta de autenticação é removida.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">6. Analytics</h2>
            <p>
              Podemos usar o Firebase Analytics para entender uso agregado do app (ex: quais telas são mais
              visitadas, taxa de conversão do plano Premium) — não usamos isso para identificar você individualmente
              fora do produto.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">7. Alterações</h2>
            <p>Podemos atualizar esta política conforme o produto evolui. Mudanças relevantes serão comunicadas dentro do app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
