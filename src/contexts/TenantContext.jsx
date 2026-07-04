import { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getWorkspaceBySlug } from '../features/onboarding/services/workspaceService.js';
import { useAuth } from './AuthContext.jsx';

const TenantContext = createContext(null);

/**
 * Loads the workspace matching the :tenantSlug URL param (REQ-02) and
 * resolves the current user's role within it (REQ-06).
 */
export function TenantProvider({ children }) {
  const { tenantSlug } = useParams();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tenantSlug) return;
    setLoading(true);
    getWorkspaceBySlug(tenantSlug)
      .then((ws) => {
        if (!ws) {
          setError('Workspace não encontrado.');
        } else {
          setWorkspace(ws);
        }
      })
      .catch(() => setError('Não foi possível carregar o workspace.'))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  const role = workspace && user ? workspace.members?.[user.uid]?.role ?? null : null;

  return (
    <TenantContext.Provider value={{ workspace, slug: tenantSlug, role, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant deve ser usado dentro de <TenantProvider>');
  return ctx;
}
