import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Tag, Settings, Landmark, Crown, ChevronRight, Download, UserX, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { deleteAllLancamentos } from '../../lancamentos/services/lancamentosService.js';
import { deleteAllCategorias } from '../../categorias/services/categoriasService.js';
import {
  getGestorUsaMovimento,
  setGestorUsaMovimento,
  deleteAllGestorLancamentos,
} from '../../gestor/services/gestorService.js';
import { exportUserData, deleteAllUserData, downloadJson } from '../services/dataPortabilityService.js';
import { deleteAccount } from '../../../firebase/auth.js';
import { track, EVENTS } from '../../../utils/analytics.js';
import Topbar from '../../../components/layout/Topbar.jsx';

export default function OpcoesPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { isPremium } = usePremium();
  const [loading, setLoading] = useState(null);
  const [gestorUsaMovimento, setGestorUsaMovimentoState] = useState(true);

  useEffect(() => {
    if (!user) return;
    getGestorUsaMovimento(user.uid).then(setGestorUsaMovimentoState);
  }, [user]);

  useEffect(() => {
    if (!isPremium) track(EVENTS.PREMIUM_CARD_VIEWED, { placement: 'opcoes' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  async function handleToggleGestorUsaMovimento() {
    const novoValor = !gestorUsaMovimento;
    if (!novoValor) {
      const limpar = await confirm(
        'A partir de agora o Gestor Financeiro vai usar um controle separado, importado manualmente. Deseja limpar os lançamentos que ele já tiver importado antes?'
      );
      if (limpar) await deleteAllGestorLancamentos(user.uid);
    }
    await setGestorUsaMovimento(user.uid, novoValor);
    setGestorUsaMovimentoState(novoValor);
  }

  async function handleZerarLancamentos() {
    if (!(await confirm('Excluir TODOS os lançamentos? Essa ação não pode ser desfeita.'))) return;
    setLoading('lancamentos');
    await deleteAllLancamentos(user.uid);
    window.location.reload();
  }

  async function handleZerarCategorias() {
    if (!(await confirm('Excluir TODAS as categorias? As categorias padrão voltam na próxima visita. Essa ação não pode ser desfeita.'))) return;
    setLoading('categorias');
    await deleteAllCategorias(user.uid);
    window.location.reload();
  }

  async function handleZerarGestor() {
    if (!(await confirm('Excluir todos os lançamentos do Gestor Financeiro? Essa ação não pode ser desfeita.'))) return;
    setLoading('gestor');
    await deleteAllGestorLancamentos(user.uid);
    window.location.reload();
  }

  // Fase 11: "Criar exportacao dos dados pessoais" (LGPD).
  async function handleExportarDados() {
    setLoading('exportar');
    try {
      const data = await exportUserData(user.uid);
      downloadJson(`conta-fechada-meus-dados-${user.uid}.json`, data);
    } finally {
      setLoading(null);
    }
  }

  // Fase 11: "Criar fluxo de exclusao de conta". Apaga o Firestore primeiro
  // e só então a conta do Firebase Auth — na ordem inversa, os dados
  // ficariam órfãos, sem dono provável pelas Firestore Rules pra apagá-los.
  async function handleExcluirConta() {
    const confirmado = await confirm(
      'Excluir sua conta e TODOS os seus dados (lançamentos, categorias, recorrências, metas, assinatura)? ' +
        'Essa ação é permanente e não pode ser desfeita. Você pode ser pedido para entrar com o Google de novo, ' +
        'para confirmar que é você.'
    );
    if (!confirmado) return;

    setLoading('conta');
    try {
      await deleteAllUserData(user.uid);
      await deleteAccount();
      // deleteAccount() dispara onAuthStateChanged(null) — o ProtectedRoute
      // redireciona pra /entrar sozinho, sem precisar navegar manualmente aqui.
    } catch (err) {
      setLoading(null);
      await confirm(`Não foi possível excluir a conta agora: ${err.message}`);
    }
  }

  return (
    <>
      <Topbar title="Opções" icon={Settings} />
      <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col gap-4">
        <Link
          to="/opcoes/meu-plano"
          onClick={() => !isPremium && track(EVENTS.PREMIUM_CARD_CLICKED, { placement: 'opcoes' })}
          className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3 hover:shadow-card-hover hover:-translate-y-px transition-all"
        >
          <div className="min-w-0 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-gold-50 text-gold-700 flex items-center justify-center shrink-0">
              <Crown size={15} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Meu Plano</p>
              <p className="text-xs text-ink-300 mt-0.5">
                {isPremium ? 'Premium ativo · gerenciar assinatura' : 'Você está no plano Gratuito · conheça o Premium'}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-ink-300 shrink-0" strokeWidth={2} />
        </Link>

        <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <Landmark size={15} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">
                Gestor Financeiro usa o Movimento automaticamente
              </p>
              <p className="text-xs text-ink-300 mt-0.5">
                Quando desativado, você escolhe manualmente quais lançamentos entram no Gestor Financeiro (um controle separado).
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={gestorUsaMovimento}
            aria-label="Gestor Financeiro usa o Movimento automaticamente"
            onClick={handleToggleGestorUsaMovimento}
            className={`w-11 h-6 rounded-pill transition-colors shrink-0 relative ${
              gestorUsaMovimento ? 'bg-ledger-500' : 'bg-ink-100 dark:bg-ink-900'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                gestorUsaMovimento ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <p className="text-sm text-ink-300">
          Ações abaixo afetam todos os seus dados e não podem ser desfeitas.
        </p>

        <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Zerar lançamentos</p>
            <p className="text-xs text-ink-300 mt-0.5">
              Apaga todos os lançamentos. Recorrências continuam ativas e voltam a gerar entradas.
            </p>
          </div>
          <button
            onClick={handleZerarLancamentos}
            disabled={loading === 'lancamentos'}
            className="shrink-0 flex items-center gap-1.5 rounded-pill bg-signal-50 text-signal-500 px-3.5 py-2 text-sm font-medium hover:bg-signal-100 transition-colors disabled:opacity-50"
          >
            <Trash2 size={15} strokeWidth={2} />
            Zerar
          </button>
        </div>

        <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Zerar categorias</p>
            <p className="text-xs text-ink-300 mt-0.5">
              Apaga todas as categorias. As categorias padrão voltam na próxima visita.
            </p>
          </div>
          <button
            onClick={handleZerarCategorias}
            disabled={loading === 'categorias'}
            className="shrink-0 flex items-center gap-1.5 rounded-pill bg-signal-50 text-signal-500 px-3.5 py-2 text-sm font-medium hover:bg-signal-100 transition-colors disabled:opacity-50"
          >
            <Tag size={15} strokeWidth={2} />
            Zerar
          </button>
        </div>

        <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Zerar Gestor Financeiro</p>
            <p className="text-xs text-ink-300 mt-0.5">
              Apaga os lançamentos importados manualmente para o Gestor Financeiro. O Movimento não é afetado.
            </p>
          </div>
          <button
            onClick={handleZerarGestor}
            disabled={loading === 'gestor'}
            className="shrink-0 flex items-center gap-1.5 rounded-pill bg-signal-50 text-signal-500 px-3.5 py-2 text-sm font-medium hover:bg-signal-100 transition-colors disabled:opacity-50"
          >
            <Landmark size={15} strokeWidth={2} />
            Zerar
          </button>
        </div>

        <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-ledger-50 text-ledger-600 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={15} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Exportar meus dados</p>
              <p className="text-xs text-ink-300 mt-0.5">Baixa uma cópia de todos os seus dados em um arquivo JSON.</p>
            </div>
          </div>
          <button
            onClick={handleExportarDados}
            disabled={loading === 'exportar'}
            className="shrink-0 flex items-center gap-1.5 rounded-pill bg-ink-50 dark:bg-ink-900 text-ink-500 px-3.5 py-2 text-sm font-medium hover:bg-ink-100 transition-colors disabled:opacity-50"
          >
            <Download size={15} strokeWidth={2} />
            {loading === 'exportar' ? 'Exportando...' : 'Exportar'}
          </button>
        </div>

        <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Excluir minha conta</p>
            <p className="text-xs text-ink-300 mt-0.5">Apaga permanentemente sua conta e todos os seus dados.</p>
          </div>
          <button
            onClick={handleExcluirConta}
            disabled={loading === 'conta'}
            className="shrink-0 flex items-center gap-1.5 rounded-pill bg-signal-50 text-signal-500 px-3.5 py-2 text-sm font-medium hover:bg-signal-100 transition-colors disabled:opacity-50"
          >
            <UserX size={15} strokeWidth={2} />
            {loading === 'conta' ? 'Excluindo...' : 'Excluir conta'}
          </button>
        </div>

        <p className="text-center text-xs text-ink-300 mt-8">
          Conta Fechada v{__APP_VERSION__} · desenvolvido por <span className="font-medium text-ink-500">LeliaLabs</span>
        </p>
        <p className="text-center text-xs text-ink-300">
          <Link to="/termos" className="underline hover:text-ink-500">Termos de Uso</Link>
          {' · '}
          <Link to="/privacidade" className="underline hover:text-ink-500">Política de Privacidade</Link>
        </p>
      </div>
    </>
  );
}
