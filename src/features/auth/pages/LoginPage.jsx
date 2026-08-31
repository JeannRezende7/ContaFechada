import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../../../firebase/auth.js';
import GoogleButton from '../components/GoogleButton.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import { clearLocalData, exportLocalData, isNativeLocalDatabaseAvailable } from '../../../db/localDatabase.js';
import { reportError } from '../../../utils/crashReporting.js';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { startLocalMode, isLocalSession } = useAuth();

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate(__NATIVE_ANDROID_BUILD__ ? '/' : '/lancamentos');
    } catch (err) {
      setError(err?.message || 'Não foi possível entrar. Tente novamente.');
      reportError(err, 'google_sign_in');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartWithoutAccount() {
    setError(null);
    setLoading(true);
    try {
      const snapshot = await exportLocalData();
      const hasLocalData = Object.values(snapshot).some((items) => items.length > 0);
      if (hasLocalData) {
        const accepted = await confirm(
          'Iniciar sem conta criará um perfil local vazio e apagará os dados desta conta neste aparelho. Faça um backup antes se quiser conservá-los. Continuar?'
        );
        if (!accepted) return;
      }
      await clearLocalData();
      startLocalMode();
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Não foi possível iniciar sem conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold mb-1">Vamos organizar as contas?</h2>
      <p className="text-ink-300 text-sm mb-6">
        {isLocalSession
          ? 'Entre com sua conta Google sem perder os dados deste aparelho.'
          : 'Sem senha, sem complicação — entre com sua conta Google.'}
      </p>
      <GoogleButton onClick={handleSignIn} loading={loading} />
      {isNativeLocalDatabaseAvailable() && !isLocalSession && (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={handleStartWithoutAccount}
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
