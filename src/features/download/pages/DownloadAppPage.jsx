import { Download, LogIn, ShieldCheck, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandIcon from '../../../components/ui/BrandIcon.jsx';

export default function DownloadAppPage() {
  return (
    <main className="min-h-screen bg-paper px-5 py-10 text-ink-900 dark:bg-ink-900 dark:text-ink-50 sm:flex sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-md">
        <section className="rounded-card bg-white p-6 text-center shadow-pop dark:bg-ink-700 sm:p-8">
          <BrandIcon size={56} className="mx-auto h-16 w-16" />
          <p className="mt-4 font-display text-2xl font-bold">Conta Fechada</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-100">
            Instale a versão Android para usar seus dados diretamente no celular, mesmo sem internet.
          </p>

          <a
            href={`/conta-fechada-${__APP_VERSION__}.apk`}
            download={`Conta-Fechada-${__APP_VERSION__}.apk`}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-pill bg-ledger-500 px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-ledger-600 hover:shadow-card-hover"
          >
            <Download size={18} /> Baixar aplicativo Android
          </a>

          <Link
            to="/lancamentos"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-pill border border-ledger-500 px-5 py-3 text-sm font-semibold text-ledger-600 transition hover:bg-ledger-50 dark:text-ledger-400 dark:hover:bg-ledger-500/10"
          >
            <LogIn size={18} /> Entrar na versão Web
          </Link>

          <div className="mt-6 space-y-3 text-left text-xs text-ink-500 dark:text-ink-100">
            <p className="flex gap-2"><Smartphone size={16} className="mt-0.5 shrink-0 text-ledger-600" />Abra o arquivo baixado e autorize a instalação pelo navegador quando o Android solicitar.</p>
            <p className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-ledger-600" />Em uma atualização futura, instale por cima da versão atual para preservar os dados locais.</p>
          </div>

          <p className="mt-6 text-[11px] text-ink-300">Versão {__APP_VERSION__} · distribuição temporária</p>
        </section>
        <p className="mt-5 text-center text-xs text-ink-300">
          <Link to="/termos" className="underline">Termos de Uso</Link>{' · '}<Link to="/privacidade" className="underline">Privacidade</Link>{' · '}<Link to="/excluir-conta" className="underline">Excluir conta</Link>
        </p>
      </div>
    </main>
  );
}
