import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandIcon from '../../../components/ui/BrandIcon.jsx';

/**
 * RASCUNHO (docs/ROADMAP_MONETIZACAO.txt, Fase 11) — escrito a partir do que o
 * app efetivamente faz hoje: dados financeiros locais, login Google opcional,
 * Google Play Billing, AdMob e serviços de diagnóstico. NÃO é aconselhamento
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
            Última atualização: 22/08/2026.
          </p>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">1. Quais dados coletamos</h2>
            <p>
              Os dados financeiros cadastrados, como lançamentos, categorias, recorrências, metas e configurações,
              são tratados localmente no aparelho. Se você optar pelo login Google, tratamos nome, e-mail, foto e
              identificador da conta. Para comprar ou restaurar a remoção de anúncios, tratamos os identificadores e
              o estado da compra. Não recebemos dados de cartão, que são processados pela Google Play.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">2. Onde os dados ficam</h2>
            <p>
              Os dados financeiros da versão atual ficam no banco local do aparelho e não são sincronizados nem
              copiados automaticamente para a nuvem. O login opcional utiliza Firebase Authentication. Dados técnicos
              necessários à compra, restauração, prevenção de fraude e administração do direito sem anúncios podem
              ser mantidos nos serviços vinculados à conta. O usuário pode exportar manualmente um backup local.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">3. Funcionamento offline</h2>
            <p>
              O aplicativo Android funciona localmente e não depende de conexão para consultar ou editar os dados.
              Antes de limpar, desinstalar ou trocar o aparelho, recomendamos exportar e guardar um backup local.
              Sem esse arquivo, dados mantidos somente no aparelho podem não ser recuperados.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">4. Com quem compartilhamos</h2>
            <p>
              Não vendemos nem enviamos seus dados financeiros ao sistema de publicidade. A versão gratuita utiliza
              o Google AdMob. O SDK de anúncios pode tratar identificadores do
              dispositivo, endereço IP, dados de diagnóstico e interações com anúncios conforme as escolhas de
              privacidade disponíveis. Os lançamentos e demais dados financeiros cadastrados no Conta Fechada não são
              enviados ao AdMob. Serviços Google também são utilizados para autenticação, compras e diagnóstico.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">5. Seus direitos (LGPD)</h2>
            <p>Você pode, a qualquer momento, direto no app (em Opções):</p>
            <ul className="list-disc pl-5 mt-1.5 flex flex-col gap-1">
              <li>Exportar uma cópia de todos os seus dados pessoais em formato legível.</li>
              <li>Excluir permanentemente sua conta e os dados associados.</li>
            </ul>
            <p className="mt-1.5">
              As instruções públicas estão disponíveis na página <Link to="/excluir-conta" className="underline">Exclusão de conta</Link>.
              O canal oficial para outras solicitações será informado nesta política e na ficha da Google Play antes
              da publicação.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">6. Retenção de dados</h2>
            <p>
              Dados vinculados à conta são mantidos enquanto ela existir ou pelo período necessário às finalidades
              informadas. Após a exclusão, podemos conservar somente registros exigidos por lei, necessários para
              comprovar compras ou prevenir fraude. Dados locais podem ser apagados pelo aplicativo, pela limpeza dos
              dados ou pela desinstalação.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">7. Analytics</h2>
            <p>
              Podemos usar o Firebase Analytics para entender uso agregado do app (ex: quais telas são mais
              visitadas e taxa de conversão da remoção de anúncios) — não usamos isso para identificar você individualmente
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
