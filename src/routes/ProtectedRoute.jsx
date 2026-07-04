import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // could render a splash/skeleton here
  if (!user) return <Navigate to="/entrar" replace />;

  return children;
}
