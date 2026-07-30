import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import LoadingScreen from '../components/ui/LoadingScreen.jsx';
import { useConfirm } from '../contexts/ConfirmContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading, initializationError, retryDatabase, recreateDatabase } = useAuth();
  const confirm = useConfirm();

  if (loading) return <LoadingScreen />;
  if (initializationError) {
    return <div role="alert" className="m-6 rounded-xl bg-signal-50 p-4 text-signal-600">
      <p>Não foi possível abrir ou validar o banco local. Seus dados não foram apagados automaticamente.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={retryDatabase} className="rounded-pill bg-white px-3 py-2 text-sm font-medium">Tentar novamente</button>
        <button type="button" onClick={async () => {
          if (await confirm('Recriar o banco local? Use apenas se as novas tentativas falharem. Os dados locais atuais serão apagados permanentemente.')) {
            await recreateDatabase();
          }
        }} className="rounded-pill bg-signal-500 px-3 py-2 text-sm font-medium text-white">Recriar banco</button>
      </div>
    </div>;
  }
  if (!user) return <Navigate to="/entrar" replace />;

  return children;
}
