import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandIcon from '../../../components/ui/BrandIcon.jsx';

/**
 * RASCUNHO (docs/ROADMAP_MONETIZACAO.txt, Fase 11: "Publicar Termos de Uso e
 * Politica de Privacidade") — escrito a partir do que o app efetivamente faz
 * hoje (uso local, login Google opcional, anúncios e Pro vitalício). NÃO é
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
              O Android pode ser usado localmente sem conta. O login Google é necessário para comprar ou restaurar
              o Pro e para recursos que dependam de identificação. Você é responsável por proteger essa conta.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">3. Gratuito e Pro vitalício</h2>
            <p>
              O modo Gratuito mantém os recursos locais essenciais e pode exibir anúncios. O Pro é uma compra única
              que remove anúncios e libera os diferenciais indicados em Meu Plano. A compra não inclui serviços
              futuros vendidos separadamente, como eventual backup em nuvem.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">4. Compra e restauração</h2>
            <p>
              O Pro não possui renovação automática. A compra é processada pela Google Play e pode ser restaurada
              usando a conta Google Play que a realizou, junto da conta usada no Conta Fechada. Reembolsos seguem as
              regras da Google Play e a legislação aplicável.
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
              Dúvidas sobre estes termos: <span className="italic">canal de suporte a definir</span> (docs/ROADMAP_MONETIZACAO.txt,
              Fase 11 — pendente).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
