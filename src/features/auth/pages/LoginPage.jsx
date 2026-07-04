import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../../../firebase/auth.js';
import { listMyWorkspaces } from '../../onboarding/services/workspaceService.js';
import GoogleButton from '../components/GoogleButton.jsx';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const { user } = await signInWithGoogle();
      const workspaces = await listMyWorkspaces(user.uid);

      if (workspaces.length === 0) {
        navigate('/novo-workspace');
      } else {
        // MVP: entra direto no primeiro workspace. Seletor de workspace
        // fica para uma iteração futura (usuário com múltiplos tenants).
        navigate(`/${workspaces[0].slug}`);
      }
    } catch (err) {
      setError('Não foi possível entrar. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-lg font-semibold mb-1">Entrar</h2>
      <p className="text-ink-300 text-sm mb-6">Sem senha. Use sua conta Google para continuar.</p>
      <GoogleButton onClick={handleSignIn} loading={loading} />
      {error && <p className="text-signal-500 text-sm mt-3">{error}</p>}
    </div>
  );
}
