import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandIcon from '../../../components/ui/BrandIcon.jsx';

/**
 * RASCUNHO (docs/ROADMAP_MONETIZACAO.txt, Fase 11: "Publicar Termos de Uso e
 * Politica de Privacidade") — escrito a partir do que o app efetivamente faz
 * hoje (uso local, login Google opcional, anúncios e remoção vitalícia). NÃO é
 * aconselhamento jurídico: precisa de revisão de um
 * advogado antes do lançamento público, especialmente as cláusulas de
 * cobrança e cancelamento assim que o checkout real (Fase 8/9) entrar no ar.
 */
export default function TermosPage() {
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
            Termos de Uso — Conta Fechada
          </h1>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none flex flex-col gap-5 text-sm text-ink-700 dark:text-ink-100 leading-relaxed">
          <p className="text-xs text-ink-300 italic">
            Última atualização: 22/08/2026.
          </p>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">1. O que é o Conta Fechada</h2>
            <p>
              O Conta Fechada é um aplicativo de organização financeira pessoal para Android. Ele permite registrar
              e consultar lançamentos, categorias, recorrências, metas, relatórios e planejamentos. O aplicativo é
              uma ferramenta de apoio e não presta serviços bancários, contábeis, de investimento ou consultoria
              financeira.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">2. Conta e acesso</h2>
            <p>
              O aplicativo pode ser usado localmente sem uma conta. O login Google é necessário somente para comprar
              ou restaurar a remoção de anúncios em aparelhos compatíveis. Você é responsável por proteger sua conta
              Google e por manter corretas as informações fornecidas.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">3. Gratuito e remoção de anúncios</h2>
            <p>
              Todas as funções locais atualmente oferecidas estão disponíveis gratuitamente. A versão gratuita pode
              exibir anúncios do Google AdMob em suas telas. Uma compra única, oferecida pela Google Play, remove os
              anúncios permanentemente da conta utilizada na compra. Essa compra não é assinatura e não cria cobrança
              recorrente. Recursos futuros, caso existam, poderão ter condições próprias informadas previamente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">4. Compra e restauração</h2>
            <p>
              O preço e a moeda válidos são os apresentados pela Google Play no momento da confirmação. A compra pode
              ser restaurada usando a mesma conta da Google Play e a conta usada no Conta Fechada. Pagamentos,
              cancelamentos e reembolsos são processados pela Google Play e seguem suas regras, sem prejuízo dos
              direitos previstos na legislação brasileira aplicável.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">5. Dados locais e backup</h2>
            <p>
              Os dados financeiros são armazenados localmente no aparelho e não são sincronizados ou copiados
              automaticamente para a nuvem. Você é responsável por exportar e guardar backups manuais antes de
              desinstalar o aplicativo, limpar seus dados, trocar de aparelho ou realizar procedimentos que possam
              apagá-los. Sem um backup exportado, dados perdidos podem não ser recuperados.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">6. Anúncios e serviços de terceiros</h2>
            <p>
              A exibição e a medição de anúncios podem utilizar serviços do Google AdMob, sujeitos às configurações de
              consentimento e às políticas do Google. Login, compras, restaurações e diagnóstico de falhas também podem
              depender de serviços do Google. A disponibilidade desses serviços pode variar por aparelho, região,
              conexão e conta.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">7. Uso aceitável</h2>
            <p>
              Você não deve usar o Conta Fechada para fins ilegais, tentar acessar contas ou dados de terceiros,
              contornar anúncios ou mecanismos de compra, explorar falhas, distribuir versões modificadas ou
              interferir no funcionamento e na segurança do aplicativo e dos serviços vinculados.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">8. Exclusão e encerramento</h2>
            <p>
              Você pode apagar os dados locais pelo aplicativo e, se tiver criado uma conta, solicitar sua exclusão
              em Opções. Consulte também a página pública de <Link to="/excluir-conta" className="underline">Exclusão de conta</Link>.
              Essas ações são permanentes. Excluir a conta do Conta Fechada não cancela nem reembolsa automaticamente
              compras processadas pela Google Play.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">9. Disponibilidade e responsabilidade</h2>
            <p>
              Trabalhamos para manter o aplicativo estável, mas não garantimos operação ininterrupta ou ausência total
              de erros. Você deve conferir valores, datas, cálculos, importações e relatórios antes de tomar decisões.
              Na extensão permitida pela legislação, não nos responsabilizamos por decisões financeiras tomadas com
              base no aplicativo nem por perda de dados decorrente da ausência de backup, falha do aparelho ou ação do
              próprio usuário.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">10. Propriedade intelectual</h2>
            <p>
              A marca, a identidade visual, os textos e o software do Conta Fechada são protegidos pela legislação
              aplicável. Estes termos concedem apenas uma licença pessoal, limitada, não exclusiva e revogável para
              utilizar o aplicativo conforme suas funcionalidades.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">11. Alterações destes termos</h2>
            <p>
              Estes termos podem ser atualizados para acompanhar mudanças no produto, na legislação ou nos serviços
              utilizados. A data da revisão será atualizada e alterações relevantes serão informadas pelos meios
              disponíveis.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">12. Legislação e contato</h2>
            <p>
              Aplicam-se as leis da República Federativa do Brasil, preservados os direitos do consumidor e o foro
              legalmente competente. O canal oficial de suporte será informado nesta página e na ficha do aplicativo
              na Google Play antes da publicação.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
