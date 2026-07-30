const STORAGE_KEY = 'contafechada:localSession';

/**
 * Fase 4 do roadmap local-first: flag de "modo gratuito local", independente
 * do Firebase Auth — existe só isso por enquanto. Ainda NADA no app lê essa
 * flag (rotas/ProtectedRoute continuam exigindo Firebase Auth em toda tela):
 * ligar isso de verdade depende de mais domínios existirem em
 * `repositories/sqlite/` (hoje só categorias e lançamentos) e da Fase 3 estar
 * verificada num dispositivo Android real — sem isso, "continuar
 * gratuitamente" abriria telas que quebram ao tentar ler/gravar dados.
 */
export function isLocalSessionActive() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function startLocalSession() {
  localStorage.setItem(STORAGE_KEY, 'true');
}

export function endLocalSession() {
  localStorage.removeItem(STORAGE_KEY);
}
