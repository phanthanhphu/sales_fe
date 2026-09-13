import { normalizeAccess } from './AccessPermissionSelector';
import { normalizeBuyerPermissions } from './BuyerPermissionSelector';

export const userConfig = {
  type: 'user',
  menuTitle: 'Users',
  pageTitle: 'User Management',
  singular: 'User',
  defaultRowsPerPage: 10,
  defaultAddValues: {
    username: '',
    email: '',
    password: '',
    address: '',
    phone: '',
    role: 'USER',
    accessPermissions: ['VIEW_SYSTEM'],
    buyerKeys: ['LLBEAN'],
    isEnabled: true,
    departmentId: ''
  },
  defaultEditValues: {
    username: '',
    email: '',
    address: '',
    phone: '',
    role: 'USER',
    accessPermissions: ['VIEW_SYSTEM'],
    buyerKeys: ['LLBEAN'],
    isEnabled: true,
    departmentId: ''
  },
  roleOptions: [
    { value: 'USER', label: 'User' },
    { value: 'ADMIN', label: 'Admin' }
  ],
  accountStatusOptions: [
    { value: 'true', label: 'Enabled' },
    { value: 'false', label: 'Disabled' }
  ],
  searchAccessOptions: [
    { value: '', label: 'All access' },
    { value: 'BOM', label: 'BOM' },
    { value: 'SALES', label: 'Sales' },
    { value: 'CURRENCY', label: 'Currency Action' },
    { value: 'REOPEN_COMPLETED_MPR', label: 'Reopen Completed MPR' },
    { value: 'VIEW_SYSTEM', label: 'View System' }
  ],
  searchFields: [
    { name: 'username', label: 'Username' },
    { name: 'email', label: 'Company Email' },
    { name: 'phone', label: 'Phone' },
    { name: 'role', label: 'Role', type: 'select' },
    { name: 'accessPermission', label: 'System Access', type: 'select' },
    { name: 'address', label: 'Address' }
  ],
  formFields: [
    { name: 'username', label: 'Username', required: true },
    { name: 'email', label: 'Company Email', required: true },
    { name: 'departmentId', label: 'Department', required: true, type: 'select' },
    { name: 'password', label: 'Initial Password', required: true, addOnly: true },
    { name: 'role', label: 'Role', type: 'select' },
    { name: 'phone', label: 'Phone' },
    { name: 'isEnabled', label: 'Account Status', type: 'select' },
    { name: 'address', label: 'Address' },
    { name: 'accessPermissions', label: 'System Access', type: 'permission-selector' },
    { name: 'buyerKeys', label: 'Buyer Access', type: 'buyer-selector' },
    { name: 'profileImage', label: 'Profile Image', type: 'image' }
  ],
  columns: [
    { label: 'User', key: 'username' },
    { label: 'Department', key: 'department' },
    { label: 'Phone', key: 'phone' },
    { label: 'Role', key: 'role' },
    { label: 'System Access', key: 'access' },
    { label: 'Buyer Access', key: 'buyers' },
    { label: 'Status', key: 'enabled' }
  ],
  maxProfileImageBytes: 5 * 1024 * 1024
};

export const getUserDepartments = (payload) => Array.isArray(payload)
  ? payload
  : (payload?.departments || payload?.data || []);

export const getUserDepartmentLabel = (department) => [
  department?.division,
  department?.departmentName || department?.name
].filter(Boolean).join(' — ');

export const toEditUserFormValues = (user = {}) => {
  const role = String(user.role || 'USER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
  return {
    username: user.username || '',
    email: user.email || '',
    address: user.address || '',
    phone: user.phone || '',
    role,
    accessPermissions: normalizeAccess(user.accessPermissions, role),
    buyerKeys: normalizeBuyerPermissions(user.buyerKeys, role),
    isEnabled: user.enabled ?? user.isEnabled ?? true,
    departmentId: user.department?.id || user.departmentId || ''
  };
};

export const validateAddUserForm = (form = {}) => {
  const next = {};
  if (!form.username.trim()) next.username = 'Username is required.';
  if (!form.email.trim()) next.email = 'Company email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
  if (!form.password) next.password = 'Password is required.';
  else if (form.password.length < 8) next.password = 'Password must be at least 8 characters long.';
  if (!form.departmentId) next.departmentId = 'Department is required.';
  if (form.role === 'USER' && !normalizeAccess(form.accessPermissions, form.role).length) next.accessPermissions = 'Select an access permission.';
  if (form.role === 'USER' && !(Array.isArray(form.buyerKeys) && form.buyerKeys.length)) next.buyerKeys = 'Select at least one Buyer.';
  return next;
};

export const validateEditUserForm = (form = {}) => {
  const next = {};
  if (!form.username.trim()) next.username = 'Username is required.';
  if (!form.email.trim()) next.email = 'Company email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
  if (!form.departmentId) next.departmentId = 'Department is required.';
  if (form.role === 'USER' && !(Array.isArray(form.buyerKeys) && form.buyerKeys.length)) next.buyerKeys = 'Select at least one Buyer.';
  return next;
};

export const buildAddUserPayload = (form = {}, image = null) => {
  const payload = new FormData();
  payload.append('username', form.username.trim());
  payload.append('email', form.email.trim());
  payload.append('password', form.password);
  payload.append('address', form.address.trim());
  payload.append('phone', form.phone.trim());
  payload.append('role', form.role);
  payload.append('departmentId', form.departmentId);
  payload.append('isEnabled', String(form.isEnabled));
  payload.append('accessPermissions', normalizeAccess(form.accessPermissions, form.role).join(','));
  payload.append('buyerKeys', normalizeBuyerPermissions(form.buyerKeys, form.role).join(','));
  if (image) payload.append('profileImage', image);
  return payload;
};

export const buildEditUserPayload = (form = {}, image = null, removeProfileImage = false) => {
  const payload = new FormData();
  payload.append('username', form.username.trim());
  payload.append('email', form.email.trim());
  payload.append('address', form.address.trim());
  payload.append('phone', form.phone.trim());
  payload.append('role', form.role);
  payload.append('departmentId', form.departmentId);
  payload.append('isEnabled', String(form.isEnabled));
  payload.append('accessPermissions', normalizeAccess(form.accessPermissions, form.role).join(','));
  payload.append('buyerKeys', normalizeBuyerPermissions(form.buyerKeys, form.role).join(','));
  if (image) payload.append('profileImage', image);
  if (removeProfileImage) payload.append('removeProfileImage', 'true');
  return payload;
};
