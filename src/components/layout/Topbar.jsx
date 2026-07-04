import { signOutUser } from '../../firebase/auth.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function Topbar({ title }) {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between px-4 py-3 md:px-8 md:py-5 border-b border-ink-100 bg-paper sticky top-0 z-10">
      <h1 className="font-display text-lg md:text-xl font-semibold text-ink-900">{title}</h1>
      <div className="flex items-center gap-3">
        {user?.photoURL && (
          <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
        )}
        <button
          onClick={signOutUser}
          className="text-sm text-ink-300 hover:text-signal-500 transition-colors"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
