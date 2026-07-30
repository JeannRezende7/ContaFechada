import { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToAuthChanges } from '../firebase/auth.js';
import { initializeRepositories } from '../repositories/provider.js';
import { isLocalSessionActive, startLocalSession, endLocalSession } from '../utils/localSession.js';
import {
  isNativeLocalDatabaseAvailable,
  recreateLocalDatabase,
  retryLocalDatabase,
} from '../db/localDatabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localSession, setLocalSession] = useState(
    () => isNativeLocalDatabaseAvailable() && isLocalSessionActive()
  );
  const [initializationError, setInitializationError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      try {
        await initializeRepositories();
        if (firebaseUser) {
          endLocalSession();
          setLocalSession(false);
        }
        setUser(firebaseUser);
      } catch (error) {
        setInitializationError(error);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{
      user: user ?? (localSession ? { uid: 'local', isLocal: true } : null),
      firebaseUser: user,
      isLocalSession: localSession,
      loading,
      initializationError,
      async retryDatabase() {
        setLoading(true);
        setInitializationError(null);
        try {
          await retryLocalDatabase();
          await initializeRepositories();
        } catch (error) {
          setInitializationError(error);
        } finally {
          setLoading(false);
        }
      },
      async recreateDatabase() {
        setLoading(true);
        setInitializationError(null);
        try {
          await recreateLocalDatabase();
          await initializeRepositories();
        } catch (error) {
          setInitializationError(error);
        } finally {
          setLoading(false);
        }
      },
      startLocalMode() {
        startLocalSession();
        setLocalSession(true);
      },
      endLocalMode() {
        endLocalSession();
        setLocalSession(false);
      },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Access the current Firebase user anywhere in the tree. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
