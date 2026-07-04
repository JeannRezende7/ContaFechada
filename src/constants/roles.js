export const ROLES = {
  ADMIN: 'admin',
  OPERADOR: 'operador',
  VISUALIZADOR: 'visualizador',
};

/** Central permission table (REQ-06). Check with can(role, action). */
const PERMISSIONS = {
  [ROLES.ADMIN]: ['create', 'edit', 'delete', 'view', 'manageMembers', 'viewBilling'],
  [ROLES.OPERADOR]: ['create', 'edit', 'view'],
  [ROLES.VISUALIZADOR]: ['view'],
};

export function can(role, action) {
  return PERMISSIONS[role]?.includes(action) ?? false;
}
