import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Landmark, Crown, ChevronRight, Download, Upload, UserX, HardDrive, LogIn, LogOut, MonitorDown, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useConfirm, useConfirmChoice } from '../../../contexts/ConfirmContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { repositories } from '../../../repositories/index.js';
import { exportUserData, deleteAllUserData, saveAndShareBackup } from '../services/dataPortabilityService.js';
import { deleteAccount, signOutUser } from '../../../firebase/auth.js';
import { clearDeviceData } from '../../../utils/deviceCache.js';
import { track, EVENTS } from '../../../utils/analytics.js';
import { getPwaInstallState, requestPwaInstall, subscribeToPwaInstall } from '../../../utils/pwaInstall.js';
import Topbar from '../../../components/layout/Topbar.jsx';
import {
  exportLocalData,
  importLocalData,
  isNativeLocalDatabaseAvailable,
} from '../../../db/localDatabase.js';
import FeedbackMessage from '../../../components/ui/FeedbackMessage.jsx';

const LAST_BACKUP_KEY = 'contafechada:last-backup-info';

function readBackupInfo() {
  try { return JSON.parse(localStorage.getItem(LAST_BACKUP_KEY)) || null; } catch { return null; }
}

function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function OpcoesPage() {
  const { user, isLocalSession } = useAuth();
  const confirm = useConfirm();
  const confirmChoice = useConfirmChoice();
  const { isPremium } = usePremium();
  const [loading, setLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('geral');
  const [gestorUsaMovimento, setGestorUsaMovimentoState] = useState(true);
  const [installState, setInstallState] = useState(getPwaInstallState);
  const [lastBackup, setLastBackup] = useState(readBackupInfo);
  const [feedback, setFeedback] = useState(null);
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

  // Fase 11: "Criar exportacao dos dados pessoais" (LGPD).
  async function handleExportarDados() {
    setLoading('exportar');
    setFeedback(null);
    try {
      const data = isNativeLocalDatabaseAvailable() ? await exportLocalData() : await exportUserData(user.uid);
      const date = new Date().toISOString().slice(0, 10);
      await saveAndShareBackup(`backup-conta-fechada-${date}.json`, data);
      const info = {
        createdAt: new Date().toISOString(),
        size: new Blob([JSON.stringify(data)]).size,
        entries: Array.isArray(data.lancamentos) ? data.lancamentos.length : 0,
      };
      localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify(info));
      setLastBackup(info);
      setFeedback({ message: 'Backup preparado. Confirme que o arquivo foi salvo fora do aplicativo.', error: false });
      return true;
    } catch (error) {
      setFeedback({ message: `Não foi possível salvar o backup: ${error.message}`, error: true });
      return false;
    } finally {
      setLoading(null);
    }
  }

  async function handleImportarDados(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    let backup;
    try {
      backup = JSON.parse(await file.text());
    } catch {
      await confirm('Este arquivo não é um backup JSON válido do Conta Fechada. Nenhum dado foi alterado.');
      return;
    }
    const visibleRecords = Object.values(backup).reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0);
    const entries = Array.isArray(backup.lancamentos) ? backup.lancamentos.length : 0;
    const choice = await confirmChoice(
      `Arquivo: ${file.name}\nTamanho: ${formatFileSize(file.size)}\nLançamentos: ${entries}\nTotal de registros: ${visibleRecords}\n\nA restauração substituirá os dados atuais deste aparelho.`,
      [
        { value: 'backup', label: 'Salvar backup atual e restaurar', tone: 'primary' },
        { value: 'restore', label: 'Restaurar sem novo backup', tone: 'danger' },
        { value: 'cancel', label: 'Cancelar', tone: 'neutral' },
      ]
    );
    if (!choice || choice === 'cancel') return;
    if (choice === 'backup' && !await handleExportarDados()) return;
    setLoading('importar');
    setFeedback(null);
    try {
      const result = await importLocalData(backup);
      const total = result.summary.financialTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      await confirm(`${result.imported} registro(s) restaurado(s) e verificados. Total financeiro conferido: ${total}. O aplicativo será recarregado.`);
      window.location.reload();
    } catch (error) {
      setFeedback({ message: `Não foi possível restaurar o backup: ${error.message}`, error: true });
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

        {!isLocalSession && <div className="grid grid-cols-2 gap-1 rounded-pill bg-ink-50 p-1 dark:bg-ink-900">
          <button type="button" onClick={() => setActiveTab('geral')} className={`rounded-pill py-2 text-sm font-medium ${activeTab === 'geral' ? 'bg-ledger-500 text-white shadow-card' : 'text-ink-500 dark:text-ink-100'}`}>Geral</button>
          <button type="button" onClick={() => setActiveTab('avancado')} className={`rounded-pill py-2 text-sm font-medium ${activeTab === 'avancado' ? 'bg-ledger-500 text-white shadow-card' : 'text-ink-500 dark:text-ink-100'}`}>Avançado</button>
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
                {isPremium ? 'Anúncios removidos permanentemente' : 'Todas as funções liberadas · remova os anúncios'}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-ink-300 shrink-0" strokeWidth={2} />
        </Link>}

        {activeTab === 'geral' && isNativeLocalDatabaseAvailable() && <section className="overflow-hidden rounded-card bg-white shadow-card dark:bg-ink-700">
          <div className="p-4 pb-0">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ledger-50 text-ledger-600"><HardDrive size={15} /></span>
            <div className="min-w-0"><h2 className="text-base font-medium">Backup dos seus dados</h2><p className="mt-0.5 text-xs text-ink-300">Salve uma cópia fora do celular para recuperar seus dados depois.</p>{lastBackup ? <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-ledger-600"><span>Último: {new Date(lastBackup.createdAt).toLocaleString('pt-BR')}</span><span>{formatFileSize(lastBackup.size)}</span><span>{lastBackup.entries} lançamento(s)</span></div> : <p className="mt-1 text-xs font-medium text-signal-500">Nenhum backup foi preparado neste aparelho.</p>}</div>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-card bg-gold-50 p-3 text-gold-900 dark:bg-ink-900 dark:text-gold-100">
            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-gold-700" />
            <p className="text-xs leading-relaxed"><strong>Importante:</strong> escolha Drive, e-mail ou outro local seguro. Se o arquivo ficar apenas neste celular, ele poderá ser perdido.</p>
          </div>
          </div>
          <div className="mt-4 grid grid-cols-2 divide-x divide-ink-100 border-t border-ink-100 dark:divide-ink-900 dark:border-ink-900">
            <button type="button" onClick={handleExportarDados} disabled={loading === 'exportar'} className="flex min-h-20 flex-col items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-ledger-600 disabled:opacity-50">
              <Download size={19} />
              {loading === 'exportar' ? 'Salvando…' : '1. Salvar backup'}
              <span className="text-xs font-normal text-ink-300">Escolha onde guardar</span>
            </button>
            <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportarDados} className="sr-only" />
            <button type="button" onClick={() => importInputRef.current?.click()} disabled={loading === 'importar'} className="flex min-h-20 flex-col items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-ink-500 dark:text-ink-100 disabled:opacity-50">
              <Upload size={19} />
              {loading === 'importar' ? 'Restaurando…' : '2. Restaurar backup'}
              <span className="text-xs font-normal text-ink-300">Substitui os dados atuais</span>
            </button>
          </div>
          <FeedbackMessage message={feedback?.message} error={feedback?.error} className="mx-4 mb-4" />
        </section>}

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
        {activeTab === 'geral' && <div className="flex bg-white dark:bg-ink-700 rounded-card shadow-card p-4 items-center justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-ledger-50 text-ledger-600 flex items-center justify-center shrink-0 mt-0.5">
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
        </div>}

        {activeTab === 'avancado' && !isLocalSession && <>
        <p className="px-1 pt-2 text-xs font-semibold uppercase text-ink-300">Conta</p>
        <div className="rounded-card bg-white p-4 shadow-card dark:bg-ink-700 flex items-center justify-between gap-3">
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
        </>}

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
