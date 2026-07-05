import { Link } from 'react-router-dom';
import { LogOut, Settings, Sun, Moon } from 'lucide-react';
import { signOutUser } from '../../firebase/auth.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function Topbar({ title, icon: Icon }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between px-4 py-3 md:px-8 md:py-5 border-b border-ink-100 dark:border-ink-700 bg-paper/95 dark:bg-ink-900/95 backdrop-blur sticky top-0 z-10">
      <h1 className="flex items-center gap-2 font-display text-lg md:text-xl font-semibold text-ink-900 dark:text-ink-50">
        {Icon && <Icon size={20} strokeWidth={1.75} className="text-ledger-500 shrink-0" />}
        {title}
      </h1>
      <div className="flex items-center gap-3">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="w-8 h-8 rounded-full ring-2 ring-paper dark:ring-ink-900 shadow-card"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-ink-100 dark:bg-ink-700 flex items-center justify-center text-ink-500 dark:text-ink-100 text-xs font-semibold">
            {user?.displayName?.[0]?.toUpperCase() ?? '?'}
          </span>
        )}

        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          className="flex items-center text-ink-300 hover:text-ink-700 dark:hover:text-ink-50 transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
        </button>

        <Link
          to="/opcoes"
          aria-label="Opções"
          className="flex items-center text-ink-300 hover:text-ink-700 dark:hover:text-ink-50 transition-colors"
        >
          <Settings size={18} strokeWidth={1.75} />
        </Link>

        <button
          onClick={signOutUser}
          aria-label="Sair"
          className="flex items-center gap-1.5 text-sm text-ink-300 hover:text-signal-500 transition-colors"
        >
          <LogOut size={16} strokeWidth={1.75} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
