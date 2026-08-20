import { Link } from 'react-router-dom';
import { Eye, EyeOff, Search, Settings, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { usePrivacy } from '../../contexts/PrivacyContext.jsx';

export default function Topbar({ title, icon: Icon }) {
  const { theme, toggleTheme } = useTheme();
  const privacy = usePrivacy();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-paper/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur dark:border-ink-700 dark:bg-ink-900/95 md:px-8 md:py-5">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="flex min-w-0 items-center gap-2 truncate font-display text-lg font-semibold text-ink-900 dark:text-ink-50 md:text-2xl">
          {Icon && <Icon size={20} strokeWidth={1.75} className="hidden shrink-0 text-ledger-500 sm:block md:h-6 md:w-6" />}
          <span className="truncate">{title}</span>
        </h1>
      </div>
      <div className="flex items-center gap-3 md:gap-4">
        <Link to="/buscar" aria-label="Busca global" className="flex items-center text-ink-300 hover:text-ledger-600">
          <Search size={18} />
        </Link>
        <button onClick={privacy.toggle} aria-label={privacy.enabled ? 'Mostrar valores' : 'Ocultar valores'} className="flex items-center text-ink-300 hover:text-ledger-600">
          {privacy.enabled ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          className="flex items-center text-ink-300 hover:text-ink-700 dark:hover:text-ink-50 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun size={18} strokeWidth={1.75} className="md:w-5 md:h-5" />
          ) : (
            <Moon size={18} strokeWidth={1.75} className="md:w-5 md:h-5" />
          )}
        </button>

        <Link
          to="/opcoes"
          aria-label="Opções"
          className="flex items-center text-ink-300 hover:text-ink-700 dark:hover:text-ink-50 transition-colors"
        >
          <Settings size={18} strokeWidth={1.75} className="md:w-5 md:h-5" />
        </Link>

      </div>
    </header>
  );
}
