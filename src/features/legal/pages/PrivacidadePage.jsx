import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandIcon from '../../../components/ui/BrandIcon.jsx';

/**
 * RASCUNHO (docs/ROADMAP_MONETIZACAO.txt, Fase 11) — escrito a partir do que o
 * app efetivamente faz hoje: Firebase Authentication (login Google) +
 * Cloud Firestore (dados financeiros), sem Analytics/Functions/Storage
 * ainda em uso além do que está descrito abaixo. NÃO é aconselhamento
 * jurídico — precisa de revisão à luz da LGPD antes do lançamento público.
 */
export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-paper px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] dark:bg-ink-900 md:py-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-ink-500 mb-6 transition-colors">
          <ArrowLeft size={15} strokeWidth={2} />
          Voltar
        </Link>

        <div className="flex items-center gap-2.5 mb-6">
          <BrandIcon size={36} className="w-9 h-9 shrink-0" />
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
              Cada registro também pode carregar um identificador técnico do aparelho que o criou, usado para
              manter a integridade do banco local e das cópias de segurança.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">2. Onde os dados ficam</h2>
            <p>
              No aplicativo Android, os dados financeiros ficam principalmente no banco local do aparelho.
              A autenticação usa Firebase Authentication (Google). Para assinantes Premium, uma cópia periódica
              de segurança é armazenada no Cloud Firestore e vinculada exclusivamente à conta do titular.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">3. Funcionamento offline</h2>
            <p>
              O aplicativo Android funciona localmente e não depende de conexão para consultar ou editar os dados.
              O backup Premium não é sincronização entre dispositivos: a restauração só ocorre quando você
              solicita essa ação em Opções. Antes de limpar o aparelho, recomendamos criar um backup local ou
              confirmar que existe uma cópia Premium recente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">4. Com quem compartilhamos</h2>
            <p>
              Não vendemos nem compartilhamos seus dados financeiros com terceiros para fins de publicidade. Dados
              são compartilhados apenas com os provedores necessários para o funcionamento do serviço: Google
              Firebase (infraestrutura), e — apenas para quem assina o Premium — o processador de pagamento
              (MercadoPago) ou a Google Play, só com o necessário para processar a cobrança.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">5. Seus direitos (LGPD)</h2>
            <p>Você pode, a qualquer momento, direto no app (em Opções):</p>
            <ul className="list-disc pl-5 mt-1.5 flex flex-col gap-1">
              <li>Exportar uma cópia de todos os seus dados pessoais em formato legível.</li>
              <li>Excluir permanentemente sua conta e todos os dados associados.</li>
            </ul>
            <p className="mt-1.5">
              Para outras solicitações (correção, portabilidade, informações sobre uso de dados):{' '}
              <span className="italic">canal de contato a definir</span> (docs/ROADMAP_MONETIZACAO.txt, Fase 11 — pendente).
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">6. Retenção de dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta existir. Ao excluir a conta, os dados são apagados
              permanentemente do Firestore e sua conta de autenticação é removida. Se você cancelar o Premium sem
              excluir a conta, mantemos a cópia na nuvem por até 90 dias antes de removê-la.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">7. Analytics</h2>
            <p>
              Podemos usar o Firebase Analytics para entender uso agregado do app (ex: quais telas são mais
              visitadas, taxa de conversão do plano Premium) — não usamos isso para identificar você individualmente
              fora do produto.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">8. Alterações</h2>
            <p>Podemos atualizar esta política conforme o produto evolui. Mudanças relevantes serão comunicadas dentro do app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
