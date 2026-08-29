export const ACCESS_PERMISSION = Object.freeze({
  BOM: 'BOM',
  SALES: 'SALES',
  REOPEN_COMPLETED_MPR: 'REOPEN_COMPLETED_MPR',
  VIEW_SYSTEM: 'VIEW_SYSTEM'
});

export const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') || {};
  } catch {
    return {};
  }
};

export const normalizeRole = (value) => {
  const role = String(value || '').trim().toUpperCase();
  return role === 'ADMIN' || role === 'ROLE_ADMIN' ? 'ADMIN' : 'USER';
};

export const isAdmin = () => normalizeRole(readStoredUser().role || localStorage.getItem('role')) === 'ADMIN';

const normalizePermissionValue = (value) => String(value || '').trim().toUpperCase();

export const normalizeAccessPermissions = (value, role = normalizeRole(readStoredUser().role || localStorage.getItem('role'))) => {
  if (role === 'ADMIN') return [ACCESS_PERMISSION.BOM, ACCESS_PERMISSION.SALES, ACCESS_PERMISSION.REOPEN_COMPLETED_MPR];

  let source = value;
  if (source === undefined || source === null || source === '') {
    source = readStoredUser().accessPermissions ?? localStorage.getItem('accessPermissions');
  }

  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      source = Array.isArray(parsed) ? parsed : source;
    } catch {
      source = source.split(/[,;|]/);
    }
  }

  const set = new Set(
    (Array.isArray(source) ? source : [])
      .map(normalizePermissionValue)
      .filter((item) => [ACCESS_PERMISSION.BOM, ACCESS_PERMISSION.SALES, ACCESS_PERMISSION.REOPEN_COMPLETED_MPR, ACCESS_PERMISSION.VIEW_SYSTEM].includes(item))
  );

  if (set.has(ACCESS_PERMISSION.VIEW_SYSTEM)) return [ACCESS_PERMISSION.VIEW_SYSTEM];
  if (!set.has(ACCESS_PERMISSION.SALES)) set.delete(ACCESS_PERMISSION.REOPEN_COMPLETED_MPR);
  if (set.size === 0) return [ACCESS_PERMISSION.VIEW_SYSTEM];
  return [...set];
};

export const getAccessPermissions = () => normalizeAccessPermissions();
export const canManageBom = () => isAdmin() || getAccessPermissions().some((item) => [ACCESS_PERMISSION.BOM, ACCESS_PERMISSION.SALES].includes(item));
export const canManageSales = () => isAdmin() || getAccessPermissions().includes(ACCESS_PERMISSION.SALES);
export const canReopenCompletedMpr = () => isAdmin() || (canManageSales() && getAccessPermissions().includes(ACCESS_PERMISSION.REOPEN_COMPLETED_MPR));
export const isViewOnly = () => !isAdmin() && getAccessPermissions().length === 1 && getAccessPermissions()[0] === ACCESS_PERMISSION.VIEW_SYSTEM;
export const canManageAdministration = () => isAdmin();

export const getAccessLabel = (permissions, role) => {
  const values = normalizeAccessPermissions(permissions, role);
  if (values.length === 1 && values[0] === ACCESS_PERMISSION.VIEW_SYSTEM) return 'View System';
  const labels = {
    [ACCESS_PERMISSION.BOM]: 'BOM',
    [ACCESS_PERMISSION.SALES]: 'Sales / MPR',
    [ACCESS_PERMISSION.REOPEN_COMPLETED_MPR]: 'Reopen Completed MPR'
  };
  return values.map((item) => labels[item] || item).join(' + ');
};
