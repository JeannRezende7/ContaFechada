import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../../../firebase/auth.js';
import GoogleButton from '../components/GoogleButton.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { isNativeLocalDatabaseAvailable } from '../../../db/localDatabase.js';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { startLocalMode, isLocalSession } = useAuth();

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setError('Não foi possível entrar. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold mb-1">Vamos organizar as contas?</h2>
      <p className="text-ink-300 text-sm mb-6">
        {isLocalSession
          ? 'Entre com sua conta Google para habilitar a nuvem. Seus dados locais serão mantidos e preparados para sincronização.'
          : 'Sem senha, sem complicação — entre com sua conta Google.'}
      </p>
      <GoogleButton onClick={handleSignIn} loading={loading} />
      {isNativeLocalDatabaseAvailable() && !isLocalSession && (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              startLocalMode();
              navigate('/');
            }}
            className="mt-3 w-full rounded-xl border border-ink-100 px-4 py-3 text-sm font-medium dark:border-ink-700"
          >
            Continuar gratuitamente sem conta
          </button>
          <p className="mt-2 text-center text-xs text-ink-300">
            Seus dados ficarão somente neste aparelho, sem backup automático. Exporte uma cópia antes de desinstalar ou trocar de celular.
          </p>
        </>
      )}
      {error && <p className="text-signal-500 text-sm mt-3">{error}</p>}
    </div>
  );
}
