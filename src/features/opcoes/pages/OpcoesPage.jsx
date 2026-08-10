import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListRestart, Trash2, Tag, Settings, Landmark, Crown, ChevronRight, Download, UserX, ShieldCheck, HardDrive, LogIn, LogOut, MonitorDown } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { repositories } from '../../../repositories/index.js';
import { exportUserData, deleteAllUserData, downloadJson } from '../services/dataPortabilityService.js';
import { deleteAccount, signOutUser } from '../../../firebase/auth.js';
import { clearDeviceData } from '../../../utils/deviceCache.js';
import { track, EVENTS } from '../../../utils/analytics.js';
import { getPwaInstallState, requestPwaInstall, subscribeToPwaInstall } from '../../../utils/pwaInstall.js';
import Topbar from '../../../components/layout/Topbar.jsx';
import {
  clearLocalData,
  exportLocalData,
  getLatestRecoverySnapshot,
  importLocalData,
  isNativeLocalDatabaseAvailable,
  restoreLatestRecoverySnapshot,
} from '../../../db/localDatabase.js';

export default function OpcoesPage() {
  const { user, isLocalSession, endLocalMode } = useAuth();
  const confirm = useConfirm();
  const { isPremium } = usePremium();
  const [loading, setLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('geral');
  const [gestorUsaMovimento, setGestorUsaMovimentoState] = useState(true);
  const [recoverySnapshot, setRecoverySnapshot] = useState(null);
  const [installState, setInstallState] = useState(getPwaInstallState);
  const importInputRef = useRef(null);

  async function handleSignOut() {
    if (isLocalSession) {
      window.location.assign('/entrar');
      return;
    }
    await signOutUser();
  }

  useEffect(() => {
    if (!user) return;
    repositories.gestor.getUsaMovimento(user.uid).then(setGestorUsaMovimentoState);
  }, [user]);

  useEffect(() => {
    if (!isNativeLocalDatabaseAvailable()) return;
    getLatestRecoverySnapshot().then(setRecoverySnapshot).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isPremium) track(EVENTS.PREMIUM_CARD_VIEWED, { placement: 'opcoes' });
  }, [isPremium]);

  useEffect(() => subscribeToPwaInstall(setInstallState), []);

  async function handleInstallApp() {
    const result = await requestPwaInstall();
    if (result.outcome !== 'unavailable') return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    await confirm(isIos
      ? 'Para instalar no iPhone ou iPad, abra esta página no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
      : 'O navegador ainda não liberou a instalação automática. Abra o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”. Se a opção não aparecer, atualize a página e tente novamente.');
  }

  async function handleToggleGestorUsaMovimento() {
    const novoValor = !gestorUsaMovimento;
    if (!novoValor) {
      const limpar = await confirm(
        'A partir de agora o Gestor Financeiro vai usar um controle separado, importado manualmente. Deseja limpar os lançamentos que ele já tiver importado antes?'
      );
      if (limpar) await repositories.gestor.removeAll(user.uid);
    }
    await repositories.gestor.setUsaMovimento(user.uid, novoValor);
    setGestorUsaMovimentoState(novoValor);
  }

  async function handleZerarLancamentos() {
    if (!(await confirm('Excluir TODOS os lançamentos? Essa ação não pode ser desfeita.'))) return;
    setLoading('lancamentos');
    await repositories.lancamentos.removeAll(user.uid);
    window.location.reload();
  }

  async function handleZerarCategorias() {
    if (!(await confirm('Excluir TODAS as categorias? As categorias padrão voltam na próxima visita. Essa ação não pode ser desfeita.'))) return;
    setLoading('categorias');
    await repositories.categorias.removeAll(user.uid);
    window.location.reload();
  }

  async function handleZerarGestor() {
    if (!(await confirm('Excluir todos os lançamentos do Gestor Financeiro? Essa ação não pode ser desfeita.'))) return;
    setLoading('gestor');
    await repositories.gestor.removeAll(user.uid);
    window.location.reload();
  }

  // Fase 11: "Criar exportacao dos dados pessoais" (LGPD).
  async function handleExportarDados() {
    setLoading('exportar');
    try {
      const data = isLocalSession ? await exportLocalData() : await exportUserData(user.uid);
      downloadJson(`conta-fechada-meus-dados-${user.uid}.json`, data);
    } finally {
      setLoading(null);
    }
  }

  async function handleLimparDispositivo() {
    if (isLocalSession) {
      if (!(await confirm('Apagar permanentemente todos os dados locais deste aparelho? Faça uma exportação antes se quiser conservar uma cópia.'))) return;
      setLoading('dispositivo');
      await clearLocalData();
      endLocalMode();
      window.location.replace('/entrar');
      return;
    }
    const confirmado = await confirm(
      'Limpar os dados financeiros armazenados neste dispositivo? Seus dados continuarão seguros na nuvem e serão baixados novamente no próximo login. ' +
        'Alterações feitas offline que ainda não foram sincronizadas podem ser perdidas. O app será desconectado e recarregado.'
    );
    if (!confirmado) return;

    setLoading('dispositivo');
    try {
      await clearDeviceData(user.uid);
      await signOutUser();
      window.location.reload();
    } catch (error) {
      setLoading(null);
      await confirm(`Não foi possível limpar este dispositivo: ${error.message}`);
      // clearDeviceData terminates Firestore before attempting the cleanup.
      // Reload even on failure so the app receives a fresh instance.
      window.location.reload();
    }
  }

  async function handleImportarDados(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!(await confirm('Substituir todos os dados locais pelos dados deste backup? Uma cópia de recuperação será mantida internamente.'))) return;
    setLoading('importar');
    try {
      const result = await importLocalData(JSON.parse(await file.text()));
      await confirm(`${result.imported} registro(s) importado(s). O aplicativo será recarregado.`);
      window.location.reload();
    } catch (error) {
      await confirm(`Não foi possível importar o backup: ${error.message}`);
      setLoading(null);
    }
  }

  function handleExportarSnapshot() {
    if (!recoverySnapshot) return;
    downloadJson(`conta-fechada-recuperacao-${Date.now()}.json`, recoverySnapshot.snapshot);
  }

  async function handleRestaurarSnapshot() {
    if (!(await confirm('Restaurar o snapshot interno mais recente? Os dados atuais serão substituídos e também receberão um snapshot de segurança.'))) return;
    setLoading('restaurar');
    try {
      await restoreLatestRecoverySnapshot();
      window.location.reload();
    } catch (error) {
      setLoading(null);
      await confirm(`Não foi possível restaurar: ${error.message}`);
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
      const uid = user.uid;
      await deleteAllUserData(uid);
      await deleteAccount();
      try {
        await clearDeviceData(uid);
      } catch (cacheError) {
        await confirm(
          `Sua conta foi excluída, mas o cache deste dispositivo não pôde ser limpo: ${cacheError.message}`
        );
      }
      window.location.replace('/entrar');
    } catch (err) {
      setLoading(null);
      await confirm(`Não foi possível excluir a conta agora: ${err.message}`);
    }
  }

  return (
    <>
      <Topbar title="Opções" icon={Settings} />
      <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col gap-4">
        <section className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center gap-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="w-11 h-11 rounded-full ring-2 ring-paper dark:ring-ink-900 shadow-card shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="w-11 h-11 rounded-full bg-ink-100 dark:bg-ink-900 flex items-center justify-center text-ink-500 dark:text-ink-100 text-base font-semibold shrink-0">
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-900 dark:text-ink-50 truncate">
              {isLocalSession ? 'Modo gratuito local' : (user?.displayName || 'Minha conta')}
            </p>
            {user?.email && <p className="text-xs text-ink-300 truncate mt-0.5">{user.email}</p>}
            {isLocalSession && <p className="mt-0.5 text-xs text-ink-300">Entre sem perder os dados deste aparelho.</p>}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="shrink-0 flex items-center gap-1.5 rounded-pill bg-ink-50 dark:bg-ink-900 text-ink-500 dark:text-ink-100 px-3.5 py-2 text-sm font-medium hover:bg-signal-50 hover:text-signal-500 transition-colors"
          >
            {isLocalSession ? <LogIn size={15} strokeWidth={2} /> : <LogOut size={15} strokeWidth={2} />}
            {isLocalSession ? 'Fazer login' : 'Sair'}
          </button>
        </section>

        <div className="grid grid-cols-2 gap-1 rounded-pill bg-ink-50 p-1 dark:bg-ink-900">
          <button type="button" onClick={() => setActiveTab('geral')} className={`rounded-pill py-2 text-sm font-medium ${activeTab === 'geral' ? 'bg-white text-ink-900 shadow-card dark:bg-ledger-500 dark:text-white' : 'text-ink-300 dark:text-ink-100'}`}>Geral</button>
          <button type="button" onClick={() => setActiveTab('avancado')} className={`rounded-pill py-2 text-sm font-medium ${activeTab === 'avancado' ? 'bg-white text-ink-900 shadow-card dark:bg-ledger-500 dark:text-white' : 'text-ink-300 dark:text-ink-100'}`}>Avançado</button>
        </div>

        {activeTab === 'avancado' && isLocalSession && <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Importar backup local</p>
            <p className="text-xs text-ink-300 mt-0.5">Substitui os dados deste aparelho por um JSON exportado pelo Conta Fechada.</p>
          </div>
          <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportarDados} className="sr-only" />
          <button type="button" onClick={() => importInputRef.current?.click()} disabled={loading === 'importar'} className="shrink-0 rounded-pill bg-ink-50 px-3.5 py-2 text-sm font-medium dark:bg-ink-900">
            {loading === 'importar' ? 'Importando…' : 'Importar'}
          </button>
        </div>}

        {activeTab === 'avancado' && isNativeLocalDatabaseAvailable() && <Link to="/opcoes/diagnostico" className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3">
          <div><p className="text-sm font-medium">Diagnóstico de sincronização</p><p className="text-xs text-ink-300">Fila, erros, conflitos, métricas e exportação para suporte.</p></div>
          <ChevronRight size={16} className="text-ink-300" />
        </Link>}

        {activeTab === 'avancado' && recoverySnapshot && <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
          <p className="text-sm font-medium">Snapshot de recuperação</p>
          <p className="mt-0.5 text-xs text-ink-300">Cópia interna mais recente: {recoverySnapshot.key}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={handleExportarSnapshot} className="rounded-pill bg-ink-50 px-3 py-2 text-xs font-medium dark:bg-ink-900">Exportar snapshot</button>
            <button type="button" onClick={handleRestaurarSnapshot} disabled={loading === 'restaurar'} className="rounded-pill bg-signal-50 px-3 py-2 text-xs font-medium text-signal-500 disabled:opacity-50">
              {loading === 'restaurar' ? 'Restaurando…' : 'Restaurar'}
            </button>
          </div>
        </div>}

        {activeTab === 'geral' && <button onClick={() => window.dispatchEvent(new Event('contafechada:open-onboarding'))} className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3 text-left hover:shadow-card-hover">
          <div className="flex items-start gap-3"><span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><ListRestart size={15} /></span><div><p className="text-sm font-medium">Retomar configuração inicial</p><p className="text-xs text-ink-300">Revise sua receita principal, contas fixas e categorias.</p></div></div>
          <ChevronRight size={16} className="text-ink-300" />
        </button>}
        {activeTab === 'geral' && installState.isBrowser && !installState.isInstalled && <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-ledger-50 text-ledger-600 flex items-center justify-center shrink-0 mt-0.5">
              <MonitorDown size={15} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Instalar Conta Fechada</p>
              <p className="text-xs text-ink-300 mt-0.5">Use como aplicativo e acesse com mais facilidade pelo seu dispositivo.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallApp}
            className="shrink-0 rounded-pill bg-ledger-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-ledger-600 transition-colors"
          >
            Instalar
          </button>
        </div>}
        {activeTab === 'geral' && <Link
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
                {isPremium ? 'Premium ativo · gerenciar assinatura' : 'Nuvem, acesso Web e automações com o Premium'}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-ink-300 shrink-0" strokeWidth={2} />
        </Link>}

        <div className={`${activeTab !== 'avancado' ? 'hidden' : 'flex'} bg-white dark:bg-ink-700 rounded-card shadow-card p-4 items-center justify-between gap-3`}>
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

        <div className={`${activeTab !== 'avancado' ? 'hidden' : 'flex'} bg-white dark:bg-ink-700 rounded-card shadow-card p-4 items-center justify-between gap-3`}>
          <div className="min-w-0 flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <HardDrive size={15} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">{isLocalSession ? 'Apagar dados locais' : 'Limpar dados deste dispositivo'}</p>
              <p className="text-xs text-ink-300 mt-0.5">
                {isLocalSession ? 'Apaga permanentemente os dados deste aparelho.' : 'Remove o cache offline local, sem apagar os dados salvos na nuvem.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLimparDispositivo}
            disabled={loading === 'dispositivo'}
            className="shrink-0 flex items-center gap-1.5 rounded-pill bg-ink-50 dark:bg-ink-900 text-ink-500 px-3.5 py-2 text-sm font-medium hover:bg-ink-100 transition-colors disabled:opacity-50"
          >
            <HardDrive size={15} strokeWidth={2} />
            {loading === 'dispositivo' ? 'Limpando...' : 'Limpar'}
          </button>
        </div>

        <p className={`${activeTab !== 'avancado' ? 'hidden' : ''} text-sm text-ink-300`}>
          Ações abaixo afetam todos os seus dados e não podem ser desfeitas.
        </p>

        <div className={`${activeTab !== 'avancado' ? 'hidden' : 'flex'} flex-col gap-4`}>
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

        {!isLocalSession && <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center justify-between gap-3">
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
        </div>}
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
