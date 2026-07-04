import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../../../firebase/auth.js';
import GoogleButton from '../components/GoogleButton.jsx';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
      <p className="text-ink-300 text-sm mb-6">Sem senha, sem complicação — entre com sua conta Google.</p>
      <GoogleButton onClick={handleSignIn} loading={loading} />
      {error && <p className="text-signal-500 text-sm mt-3">{error}</p>}
    </div>
  );
}
