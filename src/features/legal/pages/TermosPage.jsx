import { Link } from 'react-router-dom';
import { ArrowLeft, PiggyBank } from 'lucide-react';

/**
 * RASCUNHO (ROADMAP_MONETIZACAO.txt, Fase 11: "Publicar Termos de Uso e
 * Politica de Privacidade") — escrito a partir do que o app efetivamente faz
 * hoje (login Google, dados financeiros no Firestore, plano Gratuito/Premium
 * com MercadoPago). NÃO é aconselhamento jurídico: precisa de revisão de um
 * advogado antes do lançamento público, especialmente as cláusulas de
 * cobrança e cancelamento assim que o checkout real (Fase 8/9) entrar no ar.
 */
export default function TermosPage() {
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
            Termos de Uso — Conta Fechada
          </h1>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none flex flex-col gap-5 text-sm text-ink-700 dark:text-ink-100 leading-relaxed">
          <p className="text-xs text-ink-300 italic">
            Rascunho — versão 18/07/2026. Este texto ainda não passou por revisão jurídica.
          </p>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">1. O que é o Conta Fechada</h2>
            <p>
              O Conta Fechada é um aplicativo de controle financeiro pessoal (Web e Android) que permite registrar
              lançamentos, categorias, recorrências e metas financeiras. Os dados que você cadastra pertencem a você.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">2. Conta e acesso</h2>
            <p>
              O acesso é feito por login com sua conta Google. Você é responsável por manter o acesso à sua conta
              Google seguro — é por ela que autenticamos você.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">3. Plano Gratuito e Plano Premium</h2>
            <p>
              O Conta Fechada oferece um plano Gratuito, com limites descritos dentro do app (em Meu Plano), e um
              plano Premium pago, mensal ou anual, que remove esses limites. Perder o Premium — por cancelamento ou
              fim do período pago — nunca apaga seus dados: você continua podendo consultar e editar tudo que estiver
              dentro dos limites do plano Gratuito, e os dados acima do limite ficam preservados, só bloqueados para
              novas criações.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">4. Cobrança e cancelamento</h2>
            <p>
              A assinatura Premium renova automaticamente até ser cancelada. Você pode cancelar a qualquer momento em
              Meu Plano (Web) ou pela Google Play (Android) — o acesso Premium continua até o fim do período já
              pago, sem reembolso proporcional do período em curso, salvo quando exigido por lei. Um teste grátis de
              14 dias pode ser oferecido uma única vez por conta, sem necessidade de cartão de crédito.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">5. Uso aceitável</h2>
            <p>
              Não use o Conta Fechada para fins ilegais, para tentar acessar dados de outros usuários, ou para
              interferir no funcionamento do serviço.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">6. Exclusão de conta</h2>
            <p>
              Você pode excluir sua conta e todos os seus dados a qualquer momento em Opções. A exclusão é
              permanente e não pode ser desfeita.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">7. Alterações</h2>
            <p>
              Podemos atualizar estes termos conforme o produto evolui. Mudanças relevantes serão comunicadas dentro
              do app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">8. Contato</h2>
            <p>
              Dúvidas sobre estes termos: <span className="italic">canal de suporte a definir</span> (ROADMAP_MONETIZACAO.txt,
              Fase 11 — pendente).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
